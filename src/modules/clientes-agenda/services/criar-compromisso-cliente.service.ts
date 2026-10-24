import { Injectable } from '@nestjs/common';
import { ClienteCompromissoTipo } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { ArquivoAnexo } from '../clientes-agenda.constants';
import { CriarCompromissoClienteDto } from '../dto/criar-compromisso-cliente.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { mapearCompromissoInterno } from '../mappers/compromisso-cliente.mapper';
import {
  ClienteCompromissoRepository,
  CompromissoComRelacoes,
} from '../repositories/cliente-compromisso.repository';
import {
  montarCaminhoAnexoCompromisso,
  normalizarNomesAnexos,
  validarAnexosCompromisso,
} from './helpers/anexos-compromisso.helper';
import {
  ResponsavelEscolhido,
  ValidacaoResponsavelCompromissoService,
} from './validacao-responsavel-compromisso.service';

/**
 * Registra um compromisso na agenda do cliente; o autor é o usuário logado.
 * Anexos opcionais: valida tudo antes de subir, sobe no storage, grava compromisso + anexos
 * numa transação e, se algo falhar, apaga do storage o que já tinha subido.
 */
@Injectable()
export class CriarCompromissoClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ClienteCompromissoRepository,
    private readonly validacaoResponsavel: ValidacaoResponsavelCompromissoService,
    private readonly storage: StorageService,
  ) {}

  async execute(
    clienteId: bigint,
    dto: CriarCompromissoClienteDto,
    usuario: AuthUser,
    arquivos: ArquivoAnexo[] = [],
  ) {
    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    if (dto.responsavel_id && dto.responsavel_subordinado_id) {
      throw new ResponsavelCompromissoDuplicadoException();
    }
    const anexos = normalizarNomesAnexos(arquivos);
    validarAnexosCompromisso(anexos);

    const responsavel: ResponsavelEscolhido = {
      responsavelId: dto.responsavel_id ? BigInt(dto.responsavel_id) : null,
      responsavelSubordinadoId: dto.responsavel_subordinado_id
        ? BigInt(dto.responsavel_subordinado_id)
        : null,
    };
    await this.validacaoResponsavel.validar(clienteId, responsavel);

    const paraSubir = anexos.map((arquivo) => ({
      arquivo,
      caminho: this.storage.montarCaminho(
        montarCaminhoAnexoCompromisso(clienteId, arquivo.originalname, uuidv4()),
      ),
    }));
    const enviados: string[] = [];

    try {
      for (const { arquivo, caminho } of paraSubir) {
        await this.storage.put(caminho, arquivo.buffer);
        enviados.push(caminho);
      }

      const compromisso = await this.prisma.$transaction(async (tx) => {
        const criado = await this.repository.criar(
          {
            clienteId,
            autorId: usuario.id,
            ...responsavel,
            tipo: dto.tipo ?? ClienteCompromissoTipo.nota,
            titulo: dto.titulo,
            descricao: dto.descricao?.trim() || null,
            agendadoPara: new Date(dto.agendado_para),
            visivelCliente: dto.visivel_cliente ?? false,
          },
          tx,
        );
        if (paraSubir.length === 0) return criado;

        await this.repository.criarAnexos(
          paraSubir.map(({ arquivo, caminho }) => ({
            compromissoId: criado.id,
            nomeOriginal: arquivo.originalname,
            filePath: caminho,
            mimeType: arquivo.mimetype ?? null,
            tamanhoBytes: arquivo.size ?? arquivo.buffer.length,
          })),
          tx,
        );
        return (await this.repository.buscarPorId(
          clienteId,
          criado.id,
          tx,
        )) as CompromissoComRelacoes;
      });

      return mapearCompromissoInterno(compromisso);
    } catch (erro) {
      await Promise.allSettled(enviados.map((caminho) => this.storage.delete(caminho)));
      throw erro;
    }
  }
}

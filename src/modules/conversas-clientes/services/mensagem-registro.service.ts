import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { ArquivoAnexo, AutorMensagem, PessoaConversa } from '../conversas-clientes.constants';
import {
  MensagemComRelacoes,
  ConversaMensagemRepository,
} from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { montarNotificacaoMensagem } from './helpers/montar-notificacao-mensagem.helper';
import { ladoDoParticipante } from './helpers/participante-conversa.helper';
import { montarCaminhoAnexo, validarNovaMensagem } from './helpers/validar-anexos-mensagem.helper';

type DadosRegistro = {
  clienteId: bigint;
  autor: AutorMensagem;
  conteudo?: string;
  arquivos: ArquivoAnexo[];
  /** Roda na transação antes de gravar (ex.: registrar os donos ao iniciar a conversa). */
  antesDeGravar?: (tx: Prisma.TransactionClient) => Promise<void>;
};

/**
 * Service técnico compartilhado por quem escreve na conversa (equipe ou cliente):
 * valida, sobe anexos, grava mensagem + anexos + notificações dos participantes numa
 * transação e, se algo falhar, apaga do storage o que já tinha subido.
 * Não valida se o cliente existe — isso é de cada caso de uso.
 */
@Injectable()
export class MensagemRegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ConversaMensagemRepository,
    private readonly participanteRepository: ConversaParticipanteRepository,
    private readonly storage: StorageService,
    private readonly notificacaoEmissor: NotificacaoEmissorService,
  ) {}

  async registrar(dados: DadosRegistro): Promise<MensagemComRelacoes> {
    const conteudo = dados.conteudo?.trim() ?? '';
    validarNovaMensagem(conteudo, dados.arquivos);

    const clienteNome = await this.repository.buscarNomeCliente(dados.clienteId);

    const anexos = dados.arquivos.map((arquivo) => ({
      arquivo,
      caminho: montarCaminhoAnexo(dados.clienteId, arquivo.originalname, uuidv4()),
    }));
    const enviados: string[] = [];

    try {
      for (const { arquivo, caminho } of anexos) {
        await this.storage.put(caminho, arquivo.buffer);
        enviados.push(caminho);
      }

      return await this.prisma.$transaction(async (tx) => {
        await dados.antesDeGravar?.(tx);

        const criada = await this.repository.criar(
          {
            clienteId: dados.clienteId,
            autorTipo: dados.autor.tipo,
            autorId: 'userId' in dados.autor ? dados.autor.userId : null,
            autorSubordinadoId: 'subordinadoId' in dados.autor ? dados.autor.subordinadoId : null,
            conteudo,
          },
          tx,
        );

        if (anexos.length > 0) {
          await this.repository.criarAnexos(
            anexos.map(({ arquivo, caminho }) => ({
              mensagemId: criada.id,
              nomeOriginal: arquivo.originalname,
              filePath: caminho,
              mimeType: arquivo.mimetype ?? null,
              tamanhoBytes: arquivo.size ?? arquivo.buffer.length,
            })),
            tx,
          );
        }

        const destinatarios = await this.buscarDestinatarios(dados.clienteId, dados.autor, tx);
        for (const destino of ['interno', 'cliente'] as const) {
          await this.notificacaoEmissor.emitir(
            destinatarios[destino],
            montarNotificacaoMensagem({
              mensagemId: criada.id,
              clienteId: dados.clienteId,
              clienteNome,
              autorTipo: dados.autor.tipo,
              autorNome: dados.autor.nome,
              conteudo,
              quantidadeAnexos: anexos.length,
              destino,
            }),
            tx,
          );
        }

        return (await this.repository.buscarPorId(
          dados.clienteId,
          criada.id,
          tx,
        )) as MensagemComRelacoes;
      });
    } catch (erro) {
      await Promise.allSettled(enviados.map((caminho) => this.storage.delete(caminho)));
      throw erro;
    }
  }

  /**
   * Avisa os participantes com convite aceito (cada lado com o seu link); quem escreveu nunca
   * é notificado. Admin fora da lista de participantes não recebe.
   */
  private async buscarDestinatarios(
    clienteId: bigint,
    autor: AutorMensagem,
    tx: Prisma.TransactionClient,
  ): Promise<Record<'interno' | 'cliente', PessoaConversa[]>> {
    const participantes = await this.participanteRepository.listarAceitosAtivos(clienteId, tx);
    const destinatarios: Record<'interno' | 'cliente', PessoaConversa[]> = {
      interno: [],
      cliente: [],
    };
    for (const participante of participantes) {
      const ehAutor =
        'subordinadoId' in autor
          ? participante.subordinadoId === autor.subordinadoId
          : participante.userId === autor.userId;
      if (ehAutor) continue;
      destinatarios[ladoDoParticipante(participante, clienteId)].push(
        participante.subordinadoId !== null
          ? { subordinadoId: participante.subordinadoId }
          : { userId: participante.userId as bigint },
      );
    }
    return destinatarios;
  }
}

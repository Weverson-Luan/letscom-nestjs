import { Injectable } from '@nestjs/common';
import { ClienteAnotacaoTipo } from '@prisma/client';
import { DestinatarioNotificacao } from 'src/modules/notificacoes/notificacoes.constants';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { ArquivoAnexo, AutorAnotacao } from '../clientes-anotacoes.constants';
import {
  AnotacaoComRelacoes,
  ClienteAnotacaoRepository,
} from '../repositories/cliente-anotacao.repository';
import { montarNotificacaoAnotacao } from './helpers/montar-notificacao-anotacao.helper';
import { montarCaminhoAnexo, validarNovaAnotacao } from './helpers/validar-anexos-anotacao.helper';

type DadosRegistro = {
  clienteId: bigint;
  autor: AutorAnotacao;
  tipo: ClienteAnotacaoTipo;
  conteudo?: string;
  arquivos: ArquivoAnexo[];
};

/**
 * Service técnico compartilhado por quem escreve na conversa (equipe ou cliente):
 * valida, sobe anexos, grava anotação + anexos + notificações do outro lado numa
 * transação e, se algo falhar, apaga do storage o que já tinha subido.
 * Não valida se o cliente existe — isso é de cada caso de uso.
 */
@Injectable()
export class AnotacaoRegistroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ClienteAnotacaoRepository,
    private readonly storage: StorageService,
    private readonly notificacaoEmissor: NotificacaoEmissorService,
  ) {}

  async registrar(dados: DadosRegistro): Promise<AnotacaoComRelacoes> {
    const conteudo = dados.conteudo?.trim() ?? '';
    validarNovaAnotacao(conteudo, dados.arquivos);

    const [destinatarios, clienteNome] = await Promise.all([
      this.buscarDestinatarios(dados.clienteId, dados.autor),
      this.repository.buscarNomeCliente(dados.clienteId),
    ]);

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
        const criada = await this.repository.criar(
          {
            clienteId: dados.clienteId,
            autorTipo: dados.autor.tipo,
            autorId: 'userId' in dados.autor ? dados.autor.userId : null,
            autorSubordinadoId: 'subordinadoId' in dados.autor ? dados.autor.subordinadoId : null,
            tipo: dados.tipo,
            conteudo,
          },
          tx,
        );

        if (anexos.length > 0) {
          await this.repository.criarAnexos(
            anexos.map(({ arquivo, caminho }) => ({
              anotacaoId: criada.id,
              nomeOriginal: arquivo.originalname,
              filePath: caminho,
              mimeType: arquivo.mimetype ?? null,
              tamanhoBytes: arquivo.size ?? arquivo.buffer.length,
            })),
            tx,
          );
        }

        await this.notificacaoEmissor.emitir(
          destinatarios,
          montarNotificacaoAnotacao({
            anotacaoId: criada.id,
            clienteId: dados.clienteId,
            clienteNome,
            autorTipo: dados.autor.tipo,
            autorNome: dados.autor.nome,
            conteudo,
            quantidadeAnexos: anexos.length,
          }),
          tx,
        );

        return (await this.repository.buscarPorId(
          dados.clienteId,
          criada.id,
          tx,
        )) as AnotacaoComRelacoes;
      });
    } catch (erro) {
      await Promise.allSettled(enviados.map((caminho) => this.storage.delete(caminho)));
      throw erro;
    }
  }

  /** Avisa sempre "o outro lado" da conversa; quem escreveu nunca é notificado. */
  private async buscarDestinatarios(
    clienteId: bigint,
    autor: AutorAnotacao,
  ): Promise<DestinatarioNotificacao[]> {
    if (autor.tipo === 'interno') {
      const { clienteUserId, subordinadoIds } =
        await this.repository.buscarIdsLadoCliente(clienteId);
      return [
        ...(clienteUserId ? [{ userId: clienteUserId }] : []),
        ...subordinadoIds.map((subordinadoId) => ({ subordinadoId })),
      ];
    }

    const internos = await this.repository.buscarIdsInternosDaConversa(clienteId);
    return internos.map((userId) => ({ userId }));
  }
}

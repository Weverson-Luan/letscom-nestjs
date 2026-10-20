import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo, PessoaConversa } from '../conversas-clientes.constants';
import { CriarMensagemConversaDto } from '../dto/criar-mensagem-conversa.dto';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { mapearMensagemConversa } from '../mappers/mensagem-conversa.mapper';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { MensagemRegistroService } from './mensagem-registro.service';
import { ConversaAcessoService } from './conversa-acesso.service';
import { ehDonoInternoAtivo, ladoDoParticipante } from './helpers/participante-conversa.helper';
import { montarAutorInterno } from './helpers/resolver-usuario-conversa.helper';
import {
  normalizarNomesAnexos,
  validarNovaMensagem,
} from './helpers/validar-anexos-mensagem.helper';

/**
 * Equipe interna registra uma mensagem na conversa do cliente (notifica os participantes).
 * A primeira mensagem inicia a conversa: o operador e a pessoa do cliente escolhida
 * (cliente principal ou um subordinado) viram os donos — só eles convidam os demais.
 */
@Injectable()
export class CriarMensagemConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly participanteRepository: ConversaParticipanteRepository,
    private readonly acesso: ConversaAcessoService,
    private readonly registro: MensagemRegistroService,
  ) {}

  async execute(
    clienteId: bigint,
    dados: CriarMensagemConversaDto,
    arquivos: ArquivoAnexo[],
    usuario: AuthUser,
  ) {
    const anexos = normalizarNomesAnexos(arquivos);
    // validação antecipada (o registro valida de novo): evita consultar o banco à toa
    validarNovaMensagem(dados.conteudo, anexos);

    if (!(await this.repository.ehClienteAtivo(clienteId))) {
      throw new ClienteNaoEncontradoException();
    }

    const acesso = await this.acesso.garantirAcesso(clienteId, usuario);
    const contraparte = acesso.iniciada
      ? null
      : await this.resolverContraparte(clienteId, dados.subordinado_id);

    const mensagem = await this.registro.registrar({
      clienteId,
      autor: montarAutorInterno(usuario),
      conteudo: dados.conteudo,
      arquivos: anexos,
      antesDeGravar: acesso.semDonoInterno
        ? (tx) => this.registrarDonos(clienteId, usuario, contraparte, tx)
        : undefined,
    });
    return mapearMensagemConversa(mensagem, usuario);
  }

  /** Com quem a conversa é iniciada: o subordinado escolhido ou o cliente principal. */
  private async resolverContraparte(
    clienteId: bigint,
    subordinadoId?: number,
  ): Promise<PessoaConversa> {
    if (subordinadoId === undefined) return { userId: clienteId };
    const id = BigInt(subordinadoId);
    if (!(await this.participanteRepository.ehSubordinadoAtivoDoCliente(clienteId, id))) {
      throw new ParticipanteConversaInvalidoException('Subordinado não encontrado neste cliente.');
    }
    return { subordinadoId: id };
  }

  /**
   * Na transação e com a conversa travada: confere de novo quem já é dono (outra pessoa pode ter
   * iniciado ao mesmo tempo) e grava os donos que faltam, já com convite aceito.
   */
  private async registrarDonos(
    clienteId: bigint,
    usuario: AuthUser,
    contraparte: PessoaConversa | null,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.participanteRepository.travarConversa(clienteId, tx);
    const donos = await this.participanteRepository.listarDonos(clienteId, tx);
    // operador desativado não conta: quem escreve agora assume como dono interno
    const temDonoInterno = donos.some((dono) => ehDonoInternoAtivo(dono, clienteId));
    const temDonoCliente = donos.some((dono) => ladoDoParticipante(dono, clienteId) === 'cliente');

    // outro operador iniciou primeiro: só segue quem já tem acesso por convite ou é admin
    if (temDonoInterno) {
      await this.acesso.garantirAcesso(clienteId, usuario, tx);
    }

    const novosDonos: PessoaConversa[] = [
      ...(temDonoInterno ? [] : [{ userId: usuario.id }]),
      ...(temDonoCliente ? [] : [contraparte ?? { userId: clienteId }]),
    ];

    for (const pessoa of novosDonos) {
      const existente = await this.participanteRepository.buscarDaPessoa(clienteId, pessoa, tx);
      const dados = { papel: 'dono' as const, status: 'aceito' as const, respondidoEm: new Date() };
      if (existente) {
        await this.participanteRepository.atualizar(existente.id, dados, tx);
      } else {
        await this.participanteRepository.criar(
          {
            clienteId,
            userId: 'userId' in pessoa ? pessoa.userId : null,
            subordinadoId: 'subordinadoId' in pessoa ? pessoa.subordinadoId : null,
            ...dados,
          },
          tx,
        );
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TIPOS_NOTIFICACAO } from 'src/modules/notificacoes/notificacoes.constants';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import {
  LadoConversa,
  LINK_MINHA_CONVERSA,
  montarLinkConversaInterno,
  PessoaConversa,
} from '../conversas-clientes.constants';
import { ConvidarParticipanteConversaDto } from '../dto/convidar-participante-conversa.dto';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { mapearParticipanteConversa } from '../mappers/participante-conversa.mapper';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import {
  ConversaParticipanteRepository,
  ParticipanteComPessoa,
} from '../repositories/conversa-participante.repository';
import {
  ladoDoParticipante,
  montarPessoaDoUsuario,
  validarDonoConversa,
} from './helpers/participante-conversa.helper';

/**
 * Um dos donos convida alguém para a conversa. O convite chega por notificação e só dá acesso
 * depois de aceito. O operador convida equipe e lado do cliente; o dono do lado do cliente,
 * só pessoas da própria empresa. Quem recusou pode ser convidado de novo.
 */
@Injectable()
export class ConvidarParticipanteConversaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ConversaParticipanteRepository,
    private readonly mensagemRepository: ConversaMensagemRepository,
    private readonly notificacaoEmissor: NotificacaoEmissorService,
  ) {}

  async execute(clienteId: bigint, dados: ConvidarParticipanteConversaDto, usuario: AuthUser) {
    const convidado = this.extrairConvidado(dados);
    const dono = validarDonoConversa(
      await this.repository.buscarDaPessoa(clienteId, montarPessoaDoUsuario(usuario)),
    );
    const ladoConvidado = await this.validarConvidado(clienteId, convidado);

    if (ladoConvidado === 'interno' && ladoDoParticipante(dono, clienteId) === 'cliente') {
      throw new SemPermissaoConviteConversaException(
        'Você só pode convidar pessoas da sua empresa.',
      );
    }

    const clienteNome = await this.mensagemRepository.buscarNomeCliente(clienteId);

    try {
      const participante = await this.prisma.$transaction(async (tx) => {
        // serializa com outros convites/início da conversa e relê já travado
        await this.repository.travarConversa(clienteId, tx);
        const existente = await this.repository.buscarDaPessoa(clienteId, convidado, tx);
        this.validarSituacaoAtual(existente);

        const convidadoPor = {
          convidadoPorUserId: dono.userId,
          convidadoPorSubordinadoId: dono.subordinadoId,
        };
        const salvo = existente
          ? await this.repository.atualizar(
              existente.id,
              { status: 'pendente', respondidoEm: null, ...convidadoPor },
              tx,
            )
          : await this.repository.criar(
              {
                clienteId,
                userId: 'userId' in convidado ? convidado.userId : null,
                subordinadoId: 'subordinadoId' in convidado ? convidado.subordinadoId : null,
                papel: 'convidado',
                status: 'pendente',
                ...convidadoPor,
              },
              tx,
            );

        await this.notificacaoEmissor.emitir(
          [convidado],
          this.montarNotificacao(salvo.id, clienteId, clienteNome, ladoConvidado, usuario),
          tx,
        );
        return salvo;
      });
      return mapearParticipanteConversa(participante, usuario);
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ParticipanteConversaInvalidoException('Esta pessoa já tem um convite pendente.');
      }
      throw erro;
    }
  }

  private extrairConvidado(dados: ConvidarParticipanteConversaDto): PessoaConversa {
    const temUser = dados.user_id !== undefined;
    const temSubordinado = dados.subordinado_id !== undefined;
    if (temUser === temSubordinado) {
      throw new ParticipanteConversaInvalidoException(
        'Informe quem convidar: user_id ou subordinado_id.',
      );
    }
    return temUser
      ? { userId: BigInt(dados.user_id as number) }
      : { subordinadoId: BigInt(dados.subordinado_id as number) };
  }

  /** Confere se a pessoa existe, está ativa e pode estar nesta conversa; devolve o lado dela. */
  private async validarConvidado(
    clienteId: bigint,
    convidado: PessoaConversa,
  ): Promise<LadoConversa> {
    const naoEncontrado = new ParticipanteConversaInvalidoException(
      'Pessoa não encontrada para convite.',
    );
    if ('subordinadoId' in convidado) {
      if (
        !(await this.repository.ehSubordinadoAtivoDoCliente(clienteId, convidado.subordinadoId))
      ) {
        throw naoEncontrado;
      }
      return 'cliente';
    }
    if (convidado.userId === clienteId) {
      if (!(await this.repository.ehClientePrincipalAtivo(clienteId))) throw naoEncontrado;
      return 'cliente';
    }
    if (!(await this.repository.ehInternoAtivo(convidado.userId))) throw naoEncontrado;
    return 'interno';
  }

  /**
   * Dono, convidado aceito, convite pendente ou acesso inativo não recebem novo convite
   * (inativo volta pela reativação); recusado pode.
   */
  private validarSituacaoAtual(existente: ParticipanteComPessoa | null): void {
    if (existente?.status === 'inativo') {
      throw new ParticipanteConversaInvalidoException(
        'Esta pessoa está com o acesso inativo: reative em vez de convidar.',
      );
    }
    if (existente?.status === 'aceito') {
      throw new ParticipanteConversaInvalidoException('Esta pessoa já participa da conversa.');
    }
    if (existente?.status === 'pendente') {
      throw new ParticipanteConversaInvalidoException('Esta pessoa já tem um convite pendente.');
    }
  }

  private montarNotificacao(
    participanteId: bigint,
    clienteId: bigint,
    clienteNome: string | null,
    ladoConvidado: LadoConversa,
    usuario: AuthUser,
  ) {
    const nomeDono = usuario.nome?.trim() || usuario.email;
    const interno = ladoConvidado === 'interno';
    return {
      tipo: TIPOS_NOTIFICACAO.CONVITE_CONVERSA,
      titulo: 'Convite para conversa',
      mensagem: interno
        ? `${nomeDono} convidou você para a conversa com ${clienteNome ?? 'o cliente'}.`
        : `${nomeDono} convidou você para a conversa com a equipe Letscom.`,
      link: interno ? montarLinkConversaInterno(clienteId) : LINK_MINHA_CONVERSA,
      participanteId,
    };
  }
}

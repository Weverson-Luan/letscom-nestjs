import { Role } from 'src/shared/constants/roles';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { LadoConversa, PessoaConversa } from '../../conversas-clientes.constants';
import { ParticipanteConversaInvalidoException } from '../../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../../exceptions/sem-permissao-convite-conversa.exception';
import type { ParticipanteComPessoa } from '../../repositories/conversa-participante.repository';

type IdentidadeParticipante = { userId: bigint | null; subordinadoId: bigint | null };

/** Pessoa da conversa correspondente ao usuário logado (users ou users_cliente). */
export function montarPessoaDoUsuario(usuario: AuthUser): PessoaConversa {
  return usuario.tipoLogin === 'subordinado'
    ? { subordinadoId: usuario.id }
    : { userId: usuario.id };
}

/** Lado do participante: subordinado ou o próprio cliente principal são do lado do cliente. */
export function ladoDoParticipante(
  participante: IdentidadeParticipante,
  clienteId: bigint,
): LadoConversa {
  return participante.subordinadoId !== null || participante.userId === clienteId
    ? 'cliente'
    : 'interno';
}

/** Lado do usuário logado na conversa do cliente informado. */
export function ladoDoUsuario(usuario: AuthUser, clienteId: bigint): LadoConversa {
  return ladoDoParticipante(
    {
      userId: usuario.tipoLogin === 'subordinado' ? null : usuario.id,
      subordinadoId: usuario.tipoLogin === 'subordinado' ? usuario.id : null,
    },
    clienteId,
  );
}

/** Admin vê e modera qualquer conversa, mesmo sem convite (não convida: isso é dos donos). */
export function ehAdminConversa(usuario: AuthUser): boolean {
  return usuario.tipoLogin !== 'subordinado' && usuario.roles.includes(Role.ADMIN);
}

/** O participante é esta pessoa? */
export function ehMesmaPessoa(participante: IdentidadeParticipante, pessoa: PessoaConversa) {
  return 'userId' in pessoa
    ? participante.userId === pessoa.userId
    : participante.subordinadoId === pessoa.subordinadoId;
}

/** Dono como vem de `listarDonos` (com o cadastro, para saber se ainda está ativo). */
export type DonoConversa = IdentidadeParticipante & {
  id: bigint;
  user: { ativo: boolean; deletedAt: Date | null } | null;
};

export type AcessoConversa = {
  /** Linha do usuário na conversa (qualquer status) ou null se nunca foi convidado. */
  participante: ParticipanteComPessoa | null;
  /** A conversa tem dono (foi iniciada). */
  iniciada: boolean;
  /**
   * Não há dono ativo do lado da equipe: qualquer interno com a feature pode entrar e virar
   * dono (início da conversa, ou o operador que iniciou foi desativado).
   */
  semDonoInterno: boolean;
};

/** Dono interno com cadastro ativo (um operador desativado não trava a conversa). */
export function ehDonoInternoAtivo(dono: DonoConversa, clienteId: bigint): boolean {
  return (
    ladoDoParticipante(dono, clienteId) === 'interno' &&
    dono.user?.ativo === true &&
    dono.user.deletedAt === null
  );
}

export function montarAcessoConversa(
  participante: ParticipanteComPessoa | null,
  donos: DonoConversa[],
  clienteId: bigint,
): AcessoConversa {
  return {
    participante,
    iniciada: donos.length > 0,
    semDonoInterno: !donos.some((dono) => ehDonoInternoAtivo(dono, clienteId)),
  };
}

/**
 * Entra: participante com convite aceito; admin; enquanto não há dono interno ativo, qualquer
 * interno; e, antes de iniciada (sem mensagens), o lado do cliente vê a conversa vazia.
 * Participante com acesso inativado só entra se for admin.
 */
export function temAcessoConversa(
  acesso: AcessoConversa,
  clienteId: bigint,
  usuario: AuthUser,
): boolean {
  if (acesso.participante?.status === 'aceito') return true;
  if (acesso.participante?.status === 'inativo') return ehAdminConversa(usuario);
  if (ladoDoUsuario(usuario, clienteId) === 'cliente') return !acesso.iniciada;
  return ehAdminConversa(usuario) || acesso.semDonoInterno;
}

/**
 * A partir de quando o usuário vê as mensagens (como no WhatsApp): o convidado só vê o que foi
 * enviado depois de aceitar o convite (`respondidoEm` é zerado a cada novo convite). Dono, admin e
 * o interno que entra sem dono interno ativo veem todo o histórico (null = sem corte).
 */
export function calcularVisivelDesde(
  acesso: AcessoConversa,
  clienteId: bigint,
  usuario: AuthUser,
): Date | null {
  const { participante } = acesso;
  if (ehAdminConversa(usuario)) return null;
  // sem dono interno ativo, qualquer interno entra e vê tudo: ser convidado não pode dar menos
  if (acesso.semDonoInterno && ladoDoUsuario(usuario, clienteId) === 'interno') return null;
  if (participante?.papel !== 'convidado' || participante.status !== 'aceito') return null;
  return participante.respondidoEm ?? participante.createdAt;
}

/** Só os dois donos (com acesso aceito) convidam e removem participantes; admin não. */
export function validarDonoConversa(
  participante: ParticipanteComPessoa | null,
): ParticipanteComPessoa {
  if (participante?.papel !== 'dono' || participante.status !== 'aceito') {
    throw new SemPermissaoConviteConversaException();
  }
  return participante;
}

export type AcaoGestaoParticipante = 'remover' | 'inativar' | 'reativar';

/**
 * Regras comuns para o dono gerir um participante: de outra conversa é 404 (não revela que o id
 * existe), dono não é gerido e o dono do lado do cliente só gere pessoas da própria empresa.
 */
export function validarGestaoParticipante(params: {
  dono: ParticipanteComPessoa;
  participante: ParticipanteComPessoa | null;
  clienteId: bigint;
  acao: AcaoGestaoParticipante;
}): ParticipanteComPessoa {
  const { dono, participante, clienteId, acao } = params;
  if (!participante || participante.clienteId !== clienteId) {
    throw new ParticipanteConversaNaoEncontradoException();
  }
  if (participante.papel === 'dono') {
    throw new ParticipanteConversaInvalidoException(
      `Não é possível ${acao} quem iniciou a conversa.`,
    );
  }
  if (
    ladoDoParticipante(dono, clienteId) === 'cliente' &&
    ladoDoParticipante(participante, clienteId) === 'interno'
  ) {
    throw new SemPermissaoConviteConversaException(`Você só pode ${acao} pessoas da sua empresa.`);
  }
  return participante;
}

/** Convite do próprio usuário ainda sem resposta; de outra pessoa é 404 (não revela que existe). */
export function validarConvitePendenteDoUsuario(
  convite: ParticipanteComPessoa | null,
  usuario: AuthUser,
): ParticipanteComPessoa {
  if (!convite || !ehMesmaPessoa(convite, montarPessoaDoUsuario(usuario))) {
    throw new ParticipanteConversaNaoEncontradoException('Convite não encontrado.');
  }
  if (convite.status !== 'pendente') {
    throw new ParticipanteConversaInvalidoException('Este convite já foi respondido.');
  }
  return convite;
}

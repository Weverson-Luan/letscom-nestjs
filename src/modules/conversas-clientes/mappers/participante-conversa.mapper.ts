import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { LadoConversa } from '../clientes-anotacoes.constants';
import {
  CandidatoConvite,
  ParticipanteComPessoa,
} from '../repositories/conversa-participante.repository';
import {
  AcessoConversa,
  ehMesmaPessoa,
  ladoDoParticipante,
  montarPessoaDoUsuario,
} from '../services/helpers/participante-conversa.helper';

const PESSOA_REMOVIDA = 'Usuário removido';

function mapearPessoa(participante: ParticipanteComPessoa) {
  const pessoa = participante.subordinado ?? participante.user;
  return {
    id: participante.subordinadoId ?? participante.userId,
    nome: pessoa?.nome?.trim() || pessoa?.email || PESSOA_REMOVIDA,
    email: pessoa?.email ?? null,
  };
}

/** Participante na resposta HTTP. `tipo` diferencia equipe, cliente principal e subordinado. */
export function mapearParticipanteConversa(participante: ParticipanteComPessoa, usuario: AuthUser) {
  const lado = ladoDoParticipante(participante, participante.clienteId);
  return {
    id: participante.id,
    cliente_id: participante.clienteId,
    papel: participante.papel,
    status: participante.status,
    lado,
    tipo:
      participante.subordinadoId !== null
        ? 'subordinado'
        : lado === 'cliente'
          ? 'cliente'
          : 'interno',
    pessoa: mapearPessoa(participante),
    eh_eu: ehMesmaPessoa(participante, montarPessoaDoUsuario(usuario)),
    convidado_em: participante.createdAt,
    respondido_em: participante.respondidoEm,
  };
}

/**
 * Estado da conversa para o usuário logado. A lista só vai para quem tem acesso; com convite
 * pendente vai só a própria participação (para aceitar/recusar).
 */
export function mapearEstadoConversa(params: {
  acesso: AcessoConversa;
  temAcesso: boolean;
  participantes: ParticipanteComPessoa[];
  usuario: AuthUser;
}) {
  const participante = params.acesso.participante;
  return {
    iniciada: params.acesso.iniciada,
    tem_acesso: params.temAcesso,
    pode_convidar: participante?.papel === 'dono' && participante.status === 'aceito',
    minha_participacao: participante
      ? { id: participante.id, papel: participante.papel, status: participante.status }
      : null,
    participantes: params.participantes.map((linha) =>
      mapearParticipanteConversa(linha, params.usuario),
    ),
  };
}

/** Pessoa que pode ser convidada (ou, antes de iniciar, com quem iniciar). */
export function mapearCandidatoConvite(candidato: CandidatoConvite, lado: LadoConversa) {
  return {
    ...candidato,
    tipo:
      lado === 'interno'
        ? 'interno'
        : candidato.subordinado_id !== null
          ? 'subordinado'
          : 'cliente',
  };
}

import { NOME_USUARIO_REMOVIDO } from '../clientes-agenda.constants';
import { CompromissoComRelacoes } from '../repositories/cliente-compromisso.repository';

type UsuarioRelacionado = { id: bigint; nome: string | null } | null;

function mapearUsuario(id: bigint, usuario: UsuarioRelacionado) {
  return { id, nome: usuario?.nome?.trim() || NOME_USUARIO_REMOVIDO };
}

/** Pendente com data no passado. */
export function ehAtrasado(compromisso: CompromissoComRelacoes, agora: Date): boolean {
  return compromisso.status === 'pendente' && compromisso.agendadoPara < agora;
}

function mapearBase(compromisso: CompromissoComRelacoes) {
  return {
    id: compromisso.id,
    cliente_id: compromisso.clienteId,
    tipo: compromisso.tipo,
    titulo: compromisso.titulo,
    descricao: compromisso.descricao,
    agendado_para: compromisso.agendadoPara,
    status: compromisso.status,
    concluido_em: compromisso.concluidoEm,
  };
}

/** `tipo` diz de onde vem o `id`: users.id (interno/cliente) ou users_cliente.id (subordinado). */
function mapearResponsavel(compromisso: CompromissoComRelacoes) {
  if (compromisso.responsavelSubordinadoId !== null) {
    const subordinado = compromisso.responsavelSubordinado;
    return {
      tipo: 'subordinado' as const,
      id: compromisso.responsavelSubordinadoId,
      nome: subordinado?.nome?.trim() || subordinado?.email || NOME_USUARIO_REMOVIDO,
    };
  }
  if (compromisso.responsavelId === null) return null;
  return {
    tipo:
      compromisso.responsavelId === compromisso.clienteId
        ? ('cliente' as const)
        : ('interno' as const),
    ...mapearUsuario(compromisso.responsavelId, compromisso.responsavel),
  };
}

/** Compromisso visto pela equipe (backoffice). */
export function mapearCompromissoInterno(compromisso: CompromissoComRelacoes, agora = new Date()) {
  return {
    ...mapearBase(compromisso),
    visivel_cliente: compromisso.visivelCliente,
    atrasado: ehAtrasado(compromisso, agora),
    autor: mapearUsuario(compromisso.autorId, compromisso.autor),
    responsavel: mapearResponsavel(compromisso),
    created_at: compromisso.createdAt,
    updated_at: compromisso.updatedAt,
  };
}

/** Compromisso visto pelo cliente (/minha-agenda): sem `visivel_cliente` e sem `autor`. */
export function mapearCompromissoCliente(compromisso: CompromissoComRelacoes, agora = new Date()) {
  return {
    ...mapearBase(compromisso),
    atrasado: ehAtrasado(compromisso, agora),
    responsavel: mapearResponsavel(compromisso),
    created_at: compromisso.createdAt,
    updated_at: compromisso.updatedAt,
  };
}

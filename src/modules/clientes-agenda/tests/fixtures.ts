import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { CompromissoComRelacoes } from '../repositories/cliente-compromisso.repository';

export function criarUsuarioLogadoFake(sobrescrever: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 7n,
    email: 'operador@letscom.com',
    nome: 'Operador',
    ativo: true,
    tipoLogin: 'user',
    roles: ['consultor'],
    ...sobrescrever,
  };
}

/** Reunião pendente do cliente 5, criada pelo operador 7 e com o consultor 8 como responsável. */
export function criarCompromissoFake(
  sobrescrever: Partial<CompromissoComRelacoes> = {},
): CompromissoComRelacoes {
  return {
    id: 1n,
    clienteId: 5n,
    autorId: 7n,
    responsavelId: 8n,
    responsavelSubordinadoId: null,
    tipo: 'reuniao',
    titulo: 'Apresentar proposta',
    descricao: 'Levar amostras PVC',
    agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
    status: 'pendente',
    concluidoEm: null,
    visivelCliente: true,
    createdAt: new Date('2026-10-19T12:00:00.000Z'),
    updatedAt: new Date('2026-10-19T12:00:00.000Z'),
    deletedAt: null,
    autor: { id: 7n, nome: 'Operador' },
    responsavel: { id: 8n, nome: 'Consultor' },
    responsavelSubordinado: null,
    ...sobrescrever,
  };
}

import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../clientes-anotacoes.constants';
import { AnotacaoComRelacoes } from '../repositories/cliente-anotacao.repository';
import { LinhaResumoCliente } from '../repositories/cliente-resumo-anotacoes.repository';
import { ParticipanteComPessoa } from '../repositories/conversa-participante.repository';
import { DonoConversa } from '../services/helpers/participante-conversa.helper';

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

export function criarAnotacaoFake(
  sobrescrever: Partial<AnotacaoComRelacoes> = {},
): AnotacaoComRelacoes {
  return {
    id: 30n,
    clienteId: 5n,
    autorId: 7n,
    autorSubordinadoId: null,
    autorTipo: 'interno',
    tipo: 'ligacao',
    conteudo: 'Cliente pediu orçamento.',
    editadaEm: null,
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
    deletedAt: null,
    autor: { id: 7n, nome: 'Operador' },
    autorSubordinado: null,
    anexos: [],
    ...sobrescrever,
  };
}

export function criarAnexoFake() {
  return {
    id: 40n,
    anotacaoId: 30n,
    nomeOriginal: 'orçamento.pdf',
    filePath: 'clientes/5/anotacoes/uuid.pdf',
    mimeType: 'application/pdf',
    tamanhoBytes: 2048,
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
  };
}

export function criarArquivoFake(sobrescrever: Partial<ArquivoAnexo> = {}): ArquivoAnexo {
  return {
    buffer: Buffer.from('conteudo'),
    originalname: 'proposta.pdf',
    mimetype: 'application/pdf',
    size: 8,
    ...sobrescrever,
  };
}

export function criarLinhaResumoFake(
  sobrescrever: Partial<LinhaResumoCliente> = {},
): LinhaResumoCliente {
  return {
    id: 5n,
    nome: 'Empresa X',
    email: 'contato@empresax.com',
    telefone: '11988887777',
    documento: '12345678000199',
    ativo: 1,
    total_anotacoes: 3n,
    ultima_anotacao_em: new Date('2026-10-10T12:00:00.000Z'),
    ...sobrescrever,
  };
}

/** Participante interno (operador 7) dono da conversa do cliente 5, com convite aceito. */
export function criarParticipanteFake(
  sobrescrever: Partial<ParticipanteComPessoa> = {},
): ParticipanteComPessoa {
  return {
    id: 60n,
    clienteId: 5n,
    userId: 7n,
    subordinadoId: null,
    papel: 'dono',
    status: 'aceito',
    convidadoPorUserId: null,
    convidadoPorSubordinadoId: null,
    respondidoEm: new Date('2026-10-10T12:00:00.000Z'),
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
    user: { id: 7n, nome: 'Operador', email: 'operador@letscom.com' },
    subordinado: null,
    ...sobrescrever,
  };
}

/** Subordinado 3 do cliente 5 como participante. */
export function criarParticipanteSubordinadoFake(
  sobrescrever: Partial<ParticipanteComPessoa> = {},
): ParticipanteComPessoa {
  return criarParticipanteFake({
    id: 61n,
    userId: null,
    subordinadoId: 3n,
    user: null,
    subordinado: { id: 3n, nome: 'Compras', email: 'compras@cliente.test' },
    ...sobrescrever,
  });
}

/** Dono como vem de `listarDonos` (operador 7 ativo, por padrão). */
export function criarDonoFake(sobrescrever: Partial<DonoConversa> = {}): DonoConversa {
  return {
    id: 1n,
    userId: 7n,
    subordinadoId: null,
    user: { ativo: true, deletedAt: null },
    ...sobrescrever,
  };
}

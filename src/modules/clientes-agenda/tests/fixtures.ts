import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { ArquivoAnexo } from '../clientes-agenda.constants';
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
    anexos: [],
    ...sobrescrever,
  };
}

type AnexoCompromisso = CompromissoComRelacoes['anexos'][number];

/** Anexo 40 do compromisso 1 (PDF com nome acentuado). */
export function criarAnexoCompromissoFake(
  sobrescrever: Partial<AnexoCompromisso> = {},
): AnexoCompromisso {
  return {
    id: 40n,
    compromissoId: 1n,
    nomeOriginal: 'orçamento.pdf',
    filePath: 'clientes/5/agenda/compromissos/uuid.pdf',
    mimeType: 'application/pdf',
    tamanhoBytes: 3,
    createdAt: new Date('2026-10-19T12:00:00.000Z'),
    ...sobrescrever,
  };
}

/** Arquivo como o Multer entrega (memoryStorage). */
export function criarArquivoFake(sobrescrever: Partial<ArquivoAnexo> = {}): ArquivoAnexo {
  return {
    buffer: Buffer.from('pdf'),
    originalname: 'proposta.pdf',
    mimetype: 'application/pdf',
    size: 3,
    ...sobrescrever,
  };
}

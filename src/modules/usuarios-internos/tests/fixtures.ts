import { User } from '@prisma/client';

/** Usuário do Prisma usado nos specs do módulo. */
export function criarUsuarioFake(sobrescrever: Partial<User> = {}): User {
  return {
    id: 12n,
    nome: 'Maria Silva',
    email: 'maria@letscom.com',
    senha: 'hash-antigo',
    documento: '12345678901',
    ativo: true,
    tipoPessoa: 'F',
    telefone: '11999999999',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    deletedAt: null,
    ...sobrescrever,
  } as User;
}

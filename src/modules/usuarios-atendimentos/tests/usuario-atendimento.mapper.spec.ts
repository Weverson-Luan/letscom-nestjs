/**
 * IMPORTS
 */
import { UserAtendimento } from '@prisma/client';

// mappers
import { mapearUsuarioAtendimento } from '../mappers/usuario-atendimento.mapper';

describe('mapearUsuarioAtendimento', () => {
  const criadoEm = new Date('2026-01-01T10:00:00Z');
  const atualizadoEm = new Date('2026-01-02T10:00:00Z');
  const usuarioAtendimento: UserAtendimento = {
    id: 1n,
    userId: 7n,
    nome: 'Atendente',
    email: 'atendimento@empresa.com',
    telefone: '11999999999',
    documento: '123',
    ativo: true,
    createdAt: criadoEm,
    updatedAt: atualizadoEm,
  };

  it('devolve o formato completo do Laravel com o usuário dono', () => {
    const resultado = mapearUsuarioAtendimento({
      ...usuarioAtendimento,
      user: { id: 7n, nome: 'Cliente', email: 'cliente@empresa.com' },
    });

    expect(resultado).toEqual({
      id: 1n,
      user_id: 7n,
      nome: 'Atendente',
      email: 'atendimento@empresa.com',
      telefone: '11999999999',
      documento: '123',
      ativo: true,
      user: { id: 7n, nome: 'Cliente', email: 'cliente@empresa.com' },
      created_at: criadoEm,
      updated_at: atualizadoEm,
    });
  });

  it('expõe só id, nome e email do dono, mesmo recebendo a linha inteira de users', () => {
    const donoCompleto = {
      id: 7n,
      nome: 'Cliente',
      email: 'cliente@empresa.com',
      senha: '$2b$10$hash',
      documento: '12345678000199',
      telefone: '11988887777',
    };

    const resultado = mapearUsuarioAtendimento({ ...usuarioAtendimento, user: donoCompleto });

    expect(resultado.user).toEqual({ id: 7n, nome: 'Cliente', email: 'cliente@empresa.com' });
  });

  it.each([null, undefined])('devolve user undefined quando o dono vem %p', (user) => {
    expect(mapearUsuarioAtendimento({ ...usuarioAtendimento, user }).user).toBeUndefined();
  });
});

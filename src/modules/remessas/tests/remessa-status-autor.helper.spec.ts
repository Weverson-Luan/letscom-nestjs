import { extrairAutorStatus } from '../services/helpers/remessa-status-autor.helper';

describe('extrairAutorStatus', () => {
  it('usa o id do usuário interno', () => {
    expect(extrairAutorStatus({ id: BigInt(42), tipoLogin: 'user' })).toBe(BigInt(42));
  });

  it('não grava autor para subordinado (users_cliente)', () => {
    expect(extrairAutorStatus({ id: BigInt(7), tipoLogin: 'subordinado' })).toBeNull();
  });

  it('não grava autor quando não há usuário', () => {
    expect(extrairAutorStatus(null)).toBeNull();
    expect(extrairAutorStatus(undefined)).toBeNull();
  });
});

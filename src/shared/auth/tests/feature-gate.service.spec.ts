import { PrismaService } from '../../prisma/prisma.service';
import { FeatureGateService } from '../feature-gate.service';

describe('FeatureGateService', () => {
  const flags = [
    { id: BigInt(1), key: 'criar_cliente', tipoUsuario: 'admin,consultor' },
    { id: BigInt(2), key: 'inativar_cliente', tipoUsuario: 'admin' },
    { id: BigInt(3), key: 'acessar_feature_flags', tipoUsuario: null },
    { id: BigInt(4), key: 'visualizar_saldo_creditos', tipoUsuario: 'cliente, subordinado' },
  ];
  const prisma = {
    featureFlag: { findMany: jest.fn().mockResolvedValue(flags) },
  };
  let gate: FeatureGateService;

  beforeEach(() => {
    jest.clearAllMocks();
    gate = new FeatureGateService(prisma as unknown as PrismaService);
  });

  it('libera pela role presente em tipo_usuario', async () => {
    const keys = await gate.listarKeysHabilitadas({
      id: BigInt(9),
      tipoLogin: 'user',
      roles: ['consultor'],
    });
    expect(keys).toEqual(['criar_cliente']);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true } }),
    );
  });

  it('subordinado vale pela role em tipo_usuario', async () => {
    const keys = await gate.listarKeysHabilitadas({
      id: BigInt(9),
      tipoLogin: 'subordinado',
      roles: ['subordinado'],
    });

    expect(keys).toEqual(['visualizar_saldo_creditos']);
  });

  it('flag sem tipo_usuario não é liberada para ninguém', async () => {
    const keys = await gate.listarKeysHabilitadas({
      id: BigInt(9),
      tipoLogin: 'user',
      roles: ['admin', 'consultor', 'cliente'],
    });

    expect(keys).not.toContain('acessar_feature_flags');
  });

  it('permite exige pelo menos uma das features e usa cache por usuário', async () => {
    const user = { id: BigInt(9), tipoLogin: 'user' as const, roles: ['admin'] };

    await expect(gate.permite(user, ['acessar_feature_flags', 'criar_cliente'])).resolves.toBe(
      true,
    );
    await expect(gate.permite(user, ['acessar_feature_flags'])).resolves.toBe(false);
    await expect(gate.permite(undefined, ['criar_cliente'])).resolves.toBe(false);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
  });

  it('isUsuarioCliente: subordinado ou apenas roles de cliente', () => {
    expect(gate.isUsuarioCliente({ tipoLogin: 'subordinado', roles: [] })).toBe(true);
    expect(gate.isUsuarioCliente({ tipoLogin: 'user', roles: ['cliente'] })).toBe(true);
    expect(gate.isUsuarioCliente({ tipoLogin: 'user', roles: ['cliente', 'admin'] })).toBe(false);
    expect(gate.isUsuarioCliente({ tipoLogin: 'user', roles: [] })).toBe(false);
  });
});

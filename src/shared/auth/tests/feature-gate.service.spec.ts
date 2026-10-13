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
    userFeatureFlag: { findMany: jest.fn() },
  };
  let gate: FeatureGateService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.userFeatureFlag.findMany.mockResolvedValue([]);
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

  it('vínculo direto prevalece sobre a role (true libera, false bloqueia)', async () => {
    prisma.userFeatureFlag.findMany.mockResolvedValue([
      { featureFlagId: BigInt(1), ativo: false },
      { featureFlagId: BigInt(3), ativo: true },
    ]);

    const keys = await gate.listarKeysHabilitadas({
      id: BigInt(9),
      tipoLogin: 'user',
      roles: ['admin'],
    });

    expect(keys).toEqual(['inativar_cliente', 'acessar_feature_flags']);
  });

  it('subordinado não consulta vínculos diretos e vale só a role', async () => {
    const keys = await gate.listarKeysHabilitadas({
      id: BigInt(9),
      tipoLogin: 'subordinado',
      roles: ['subordinado'],
    });

    expect(keys).toEqual(['visualizar_saldo_creditos']);
    expect(prisma.userFeatureFlag.findMany).not.toHaveBeenCalled();
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

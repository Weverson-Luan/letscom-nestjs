import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature } from 'src/shared/auth/features';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { HashService } from 'src/shared/utils/hash.service';
import { AtualizarUsuarioRepository } from '../repositories/atualizar-usuario.repository';
import { AtualizarUsuarioService } from '../services/atualizar-usuario.service';

describe('AtualizarUsuarioService', () => {
  let service: AtualizarUsuarioService;
  const repository = {
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    substituirTipoEntrega: jest.fn(),
  };
  const hash = { make: jest.fn() };
  const roleUserRepo = { findRoleNamesForUser: jest.fn() };
  const featureGate = { isUsuarioCliente: jest.fn(), permite: jest.fn() };

  const clienteId = BigInt(20);
  const admin: AuthUser = {
    id: BigInt(1),
    email: 'admin@letscom.com',
    nome: 'Admin',
    ativo: true,
    tipoLogin: 'user',
    roles: ['admin'],
  };
  const cliente: AuthUser = { ...admin, id: clienteId, roles: ['cliente'] };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.buscarPorId.mockResolvedValue({ id: clienteId });
    roleUserRepo.findRoleNamesForUser.mockResolvedValue(['cliente']);
    featureGate.isUsuarioCliente.mockImplementation((user) => user.roles.includes('cliente'));
    featureGate.permite.mockResolvedValue(true);
    hash.make.mockResolvedValue('hash');
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarUsuarioService,
        { provide: AtualizarUsuarioRepository, useValue: repository },
        { provide: HashService, useValue: hash },
        { provide: RoleUserRepository, useValue: roleUserRepo },
        { provide: FeatureGateService, useValue: featureGate },
      ],
    }).compile();

    service = moduleRef.get(AtualizarUsuarioService);
  });

  it('lança 404 quando o usuário não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(admin, clienteId, { nome: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza só os campos informados e criptografa a senha', async () => {
    await expect(
      service.execute(admin, clienteId, { nome: 'Novo', tipo_pessoa: 'fisica', senha: 'abc' }),
    ).resolves.toBe(true);

    expect(repository.atualizar).toHaveBeenCalledWith(clienteId, {
      nome: 'Novo',
      tipoPessoa: 'fisica',
      senha: 'hash',
    });
    expect(featureGate.permite).toHaveBeenCalledWith(admin, [Feature.EDITAR_CLIENTE]);
  });

  it('substitui o tipo de entrega quando informado', async () => {
    await service.execute(admin, clienteId, { tipo_entrega_id: 9 });

    expect(repository.substituirTipoEntrega).toHaveBeenCalledWith(clienteId, BigInt(9));
  });

  it('permite o próprio usuário editar seus dados', async () => {
    await expect(service.execute(cliente, clienteId, { nome: 'Novo' })).resolves.toBe(true);
  });

  it('recusa o próprio usuário ativar/inativar a si mesmo', async () => {
    await expect(service.execute(cliente, clienteId, { ativo: false })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('permite o subordinado editar o cliente ao qual pertence', async () => {
    const subordinado: AuthUser = {
      ...admin,
      id: BigInt(30),
      tipoLogin: 'subordinado',
      roles: ['subordinado'],
      clienteId,
    };

    await expect(service.execute(subordinado, clienteId, { nome: 'Novo' })).resolves.toBe(true);
    await expect(service.execute(subordinado, BigInt(99), { nome: 'Novo' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('recusa usuário interno editando quem não é cliente', async () => {
    roleUserRepo.findRoleNamesForUser.mockResolvedValue(['admin']);

    await expect(service.execute(admin, clienteId, { nome: 'Novo' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite usuário interno com inativar_cliente inativar um cliente', async () => {
    await expect(service.execute(admin, clienteId, { ativo: false })).resolves.toBe(true);
    expect(repository.atualizar).toHaveBeenCalledWith(clienteId, { ativo: false });
  });

  it('recusa cliente editando outro cliente', async () => {
    await expect(service.execute(cliente, BigInt(99), { nome: 'Novo' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('recusa inativar cliente sem a feature inativar_cliente', async () => {
    featureGate.permite.mockResolvedValue(false);

    await expect(service.execute(admin, clienteId, { ativo: false })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(featureGate.permite).toHaveBeenCalledWith(admin, [Feature.INATIVAR_CLIENTE]);
  });

  it('recusa editar cliente sem a feature editar_cliente', async () => {
    featureGate.permite.mockImplementation(async (_user, features) =>
      features.includes(Feature.INATIVAR_CLIENTE),
    );

    await expect(
      service.execute(admin, clienteId, { ativo: false, nome: 'Novo' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

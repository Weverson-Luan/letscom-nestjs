/**
 * IMPORTS
 */
import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// shared / auth (features e mensagens de permissão)
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';

// shared / decorators (usuário autenticado)
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// shared / utils (hash de senha)
import { HashService } from 'src/shared/utils/hash.service';

// repositories
import { AtualizarUsuarioClienteRepository } from '../repositories/atualizar-usuario-cliente.repository';

// services
import { AtualizarUsuarioClienteService } from '../services/atualizar-usuario-cliente.service';

describe('AtualizarUsuarioClienteService', () => {
  let service: AtualizarUsuarioClienteService;
  const repository = { buscarPorId: jest.fn(), atualizar: jest.fn() };
  const hash = { make: jest.fn() };
  const featureGate = { permite: jest.fn() };

  const autenticado: AuthUser = {
    id: 1n,
    email: 'admin@letscom.test',
    nome: 'Admin',
    ativo: true,
    tipoLogin: 'user',
    roles: ['admin'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    featureGate.permite.mockResolvedValue(true);
    hash.make.mockResolvedValue('hash');
    repository.buscarPorId.mockResolvedValue({ id: 4n });
    repository.atualizar.mockResolvedValue({ id: 4n, nome: 'Novo' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarUsuarioClienteService,
        { provide: AtualizarUsuarioClienteRepository, useValue: repository },
        { provide: HashService, useValue: hash },
        { provide: FeatureGateService, useValue: featureGate },
      ],
    }).compile();

    service = moduleRef.get(AtualizarUsuarioClienteService);
  });

  it('atualiza só os campos enviados e criptografa a senha', async () => {
    await expect(
      service.execute(autenticado, 4n, { nome: 'Novo', senha: 'nova123', email: undefined }),
    ).resolves.toEqual({ id: 4n, nome: 'Novo' });

    expect(featureGate.permite).toHaveBeenCalledTimes(1);
    expect(featureGate.permite).toHaveBeenCalledWith(autenticado, [
      Feature.EDITAR_USUARIOS_CLIENTE,
    ]);
    expect(repository.atualizar).toHaveBeenCalledWith(4n, { nome: 'Novo', senha: 'hash' });
  });

  it('exige só inativar_usuario_cliente quando altera apenas ativo', async () => {
    await service.execute(autenticado, 4n, { ativo: false });

    expect(featureGate.permite).toHaveBeenCalledTimes(1);
    expect(featureGate.permite).toHaveBeenCalledWith(autenticado, [
      Feature.INATIVAR_USUARIO_CLIENTE,
    ]);
    expect(repository.atualizar).toHaveBeenCalledWith(4n, { ativo: false });
  });

  it('exige as duas features quando altera ativo e outros campos', async () => {
    await service.execute(autenticado, 4n, { ativo: true, documento: '123' });

    expect(featureGate.permite).toHaveBeenCalledWith(autenticado, [
      Feature.INATIVAR_USUARIO_CLIENTE,
    ]);
    expect(featureGate.permite).toHaveBeenCalledWith(autenticado, [
      Feature.EDITAR_USUARIOS_CLIENTE,
    ]);
  });

  it('lança 403 antes de buscar o usuário quando falta a feature', async () => {
    featureGate.permite.mockResolvedValue(false);

    const erro = await service
      .execute(autenticado, 4n, { ativo: false })
      .catch((excecao) => excecao);

    expect(erro).toBeInstanceOf(ForbiddenException);
    expect(erro.message).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(repository.buscarPorId).not.toHaveBeenCalled();
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 404 quando o usuário não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    const erro = await service.execute(autenticado, 4n, { nome: 'X' }).catch((excecao) => excecao);

    expect(erro).toBeInstanceOf(BusinessException);
    expect(erro.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('não exige feature nem altera campos quando o corpo está vazio', async () => {
    await service.execute(autenticado, 4n, {});

    expect(featureGate.permite).not.toHaveBeenCalled();
    expect(hash.make).not.toHaveBeenCalled();
    expect(repository.atualizar).toHaveBeenCalledWith(4n, {});
  });
});

import { Test } from '@nestjs/testing';
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { AcessoBackofficeNegadoException } from '../exceptions/acesso-backoffice-negado.exception';
import { CodigoAcessoBackofficeInvalidoException } from '../exceptions/codigo-acesso-backoffice-invalido.exception';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';
import { CodigoAcessoBackofficeCacheService } from '../services/codigo-acesso-backoffice-cache.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { TrocarCodigoAcessoBackofficeService } from '../services/trocar-codigo-acesso-backoffice.service';

describe('TrocarCodigoAcessoBackofficeService', () => {
  let service: TrocarCodigoAcessoBackofficeService;

  const codigo = 'a'.repeat(64);
  const usuario = {
    id: BigInt(7),
    nome: 'Admin Letscom',
    email: 'admin@letscom.com',
    senha: 'hash',
    ativo: true,
    documento: null,
    tipoPessoa: 'F',
  };

  const codigoCache = { consumir: jest.fn() };
  const usuarioRepo = { buscarPorId: jest.fn(), buscarConsultorDoCliente: jest.fn() };
  const roleUserRepo = { findRoleNamesForUser: jest.fn(), findPrimaryRoleForUser: jest.fn() };
  const featureGate = { listarKeysHabilitadas: jest.fn(), isUsuarioCliente: jest.fn() };
  const jwtTokenService = { createToken: jest.fn().mockReturnValue('access-token') };
  const refreshTokenService = { issue: jest.fn().mockResolvedValue('refresh-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    codigoCache.consumir.mockResolvedValue({ userId: '7' });
    usuarioRepo.buscarPorId.mockResolvedValue(usuario);
    usuarioRepo.buscarConsultorDoCliente.mockResolvedValue(null);
    roleUserRepo.findRoleNamesForUser.mockResolvedValue(['admin']);
    roleUserRepo.findPrimaryRoleForUser.mockResolvedValue({ id: 1, nome: 'admin' });
    featureGate.listarKeysHabilitadas.mockResolvedValue(['acessar_backoffice']);
    featureGate.isUsuarioCliente.mockReturnValue(false);

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrocarCodigoAcessoBackofficeService,
        { provide: CodigoAcessoBackofficeCacheService, useValue: codigoCache },
        { provide: UsuarioInternoRepository, useValue: usuarioRepo },
        { provide: RoleUserRepository, useValue: roleUserRepo },
        { provide: FeatureGateService, useValue: featureGate },
        { provide: JwtTokenService, useValue: jwtTokenService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    service = moduleRef.get(TrocarCodigoAcessoBackofficeService);
  });

  it('troca o código por sessão no formato do login', async () => {
    const resposta = await service.execute({ codigo });

    expect(codigoCache.consumir).toHaveBeenCalledWith(codigo);
    expect(usuarioRepo.buscarPorId).toHaveBeenCalledWith(BigInt(7));
    expect(featureGate.listarKeysHabilitadas).toHaveBeenCalledWith({
      id: BigInt(7),
      tipoLogin: 'user',
      roles: ['admin'],
    });
    expect(jwtTokenService.createToken).toHaveBeenCalledWith({
      sub: BigInt(7),
      tipo_login: 'user',
      email: 'admin@letscom.com',
    });
    expect(refreshTokenService.issue).toHaveBeenCalledWith({
      kind: 'user',
      id: BigInt(7),
      email: 'admin@letscom.com',
      ativo: true,
    });
    expect(usuarioRepo.buscarConsultorDoCliente).toHaveBeenCalledWith(BigInt(7));
    expect(resposta).toEqual({
      code: 200,
      message: 'Usuário logado com sucesso!',
      data: {
        id: BigInt(7),
        tipo_login: 'user',
        nome: 'Admin Letscom',
        email: 'admin@letscom.com',
        documento: null,
        tipo_pessoa: 'F',
        consultor: null,
        roles: { id: 1, nome: 'admin' },
        features: ['acessar_backoffice'],
      },
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('consome o código antes de emitir qualquer token', async () => {
    await service.execute({ codigo });

    const consumo = codigoCache.consumir.mock.invocationCallOrder[0];
    expect(consumo).toBeLessThan(jwtTokenService.createToken.mock.invocationCallOrder[0]);
    expect(consumo).toBeLessThan(refreshTokenService.issue.mock.invocationCallOrder[0]);
  });

  it('serializa o consultor sem a senha', async () => {
    usuarioRepo.buscarConsultorDoCliente.mockResolvedValue({
      id: BigInt(3),
      nome: 'Consultor',
      senha: 'hash',
    });

    const resposta = await service.execute({ codigo });

    expect(resposta.data.consultor).toEqual({ id: BigInt(3), nome: 'Consultor' });
  });

  it('responde 401 para código inexistente, expirado, já usado ou corrompido', async () => {
    codigoCache.consumir.mockResolvedValue(null);

    await expect(service.execute({ codigo })).rejects.toBeInstanceOf(
      CodigoAcessoBackofficeInvalidoException,
    );
    expect(usuarioRepo.buscarPorId).not.toHaveBeenCalled();
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('responde 401 quando o usuário do código não existe mais', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue(null);

    await expect(service.execute({ codigo })).rejects.toBeInstanceOf(
      CodigoAcessoBackofficeInvalidoException,
    );
  });

  it('responde 422 para usuário desativado', async () => {
    usuarioRepo.buscarPorId.mockResolvedValue({ ...usuario, ativo: false });

    await expect(service.execute({ codigo })).rejects.toMatchObject({ status: 422 });
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('responde 403 quando o usuário perdeu a feature acessar_backoffice', async () => {
    featureGate.listarKeysHabilitadas.mockResolvedValue(['pesquisar_remessas']);

    await expect(service.execute({ codigo })).rejects.toBeInstanceOf(
      AcessoBackofficeNegadoException,
    );
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('responde 403 para usuário cliente', async () => {
    featureGate.isUsuarioCliente.mockReturnValue(true);

    await expect(service.execute({ codigo })).rejects.toBeInstanceOf(
      AcessoBackofficeNegadoException,
    );
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });
});

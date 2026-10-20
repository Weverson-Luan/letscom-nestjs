import { Test } from '@nestjs/testing';
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { AcessoBackofficeNegadoException } from '../exceptions/acesso-backoffice-negado.exception';
import { CodigoAcessoBackofficeCacheService } from '../services/codigo-acesso-backoffice-cache.service';
import { GerarCodigoAcessoBackofficeService } from '../services/gerar-codigo-acesso-backoffice.service';

describe('GerarCodigoAcessoBackofficeService', () => {
  let service: GerarCodigoAcessoBackofficeService;
  const codigoCache = { guardar: jest.fn() };
  const featureGate = { isUsuarioCliente: jest.fn() };

  const usuarioInterno: AuthUser = {
    id: BigInt(7),
    email: 'admin@letscom.com',
    nome: 'Admin',
    ativo: true,
    tipoLogin: 'user',
    roles: ['admin'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    featureGate.isUsuarioCliente.mockReturnValue(false);
    const moduleRef = await Test.createTestingModule({
      providers: [
        GerarCodigoAcessoBackofficeService,
        { provide: CodigoAcessoBackofficeCacheService, useValue: codigoCache },
        { provide: FeatureGateService, useValue: featureGate },
      ],
    }).compile();

    service = moduleRef.get(GerarCodigoAcessoBackofficeService);
  });

  it('gera código hex de 64 caracteres e guarda o id do usuário', async () => {
    const resposta = await service.execute(usuarioInterno);

    expect(resposta).toEqual({
      code: 200,
      message: expect.any(String),
      data: { codigo: expect.stringMatching(/^[0-9a-f]{64}$/), expira_em_segundos: 60 },
    });
    expect(codigoCache.guardar).toHaveBeenCalledWith(resposta.data.codigo, { userId: '7' });
  });

  it('gera códigos diferentes a cada chamada', async () => {
    const a = await service.execute(usuarioInterno);
    const b = await service.execute(usuarioInterno);

    expect(a.data.codigo).not.toBe(b.data.codigo);
  });

  it('recusa subordinado com 403', async () => {
    await expect(
      service.execute({ ...usuarioInterno, tipoLogin: 'subordinado', roles: ['subordinado'] }),
    ).rejects.toBeInstanceOf(AcessoBackofficeNegadoException);
    expect(codigoCache.guardar).not.toHaveBeenCalled();
  });

  it('recusa cliente com 403 mesmo com a feature liberada', async () => {
    featureGate.isUsuarioCliente.mockReturnValue(true);

    await expect(service.execute({ ...usuarioInterno, roles: ['cliente'] })).rejects.toBeInstanceOf(
      AcessoBackofficeNegadoException,
    );
    expect(featureGate.isUsuarioCliente).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ['cliente'] }),
    );
    expect(codigoCache.guardar).not.toHaveBeenCalled();
  });
});

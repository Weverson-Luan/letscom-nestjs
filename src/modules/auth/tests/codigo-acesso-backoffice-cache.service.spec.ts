import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { CodigoAcessoBackofficeCacheService } from '../services/codigo-acesso-backoffice-cache.service';
import { chaveCodigoAcessoBackoffice } from '../services/helpers/codigo-acesso-backoffice.helper';

describe('CodigoAcessoBackofficeCacheService', () => {
  let service: CodigoAcessoBackofficeCacheService;
  const codigo = 'a'.repeat(64);
  const cliente = { set: jest.fn(), getDel: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CodigoAcessoBackofficeCacheService,
        { provide: CACHE_MANAGER, useValue: { store: { client: cliente } } },
      ],
    }).compile();

    service = moduleRef.get(CodigoAcessoBackofficeCacheService);
  });

  it('guarda o valor serializado na chave com hash e TTL de 60s', async () => {
    await service.guardar(codigo, { userId: '7' });

    expect(cliente.set).toHaveBeenCalledWith(
      chaveCodigoAcessoBackoffice(codigo),
      JSON.stringify({ userId: '7' }),
      { EX: 60 },
    );
  });

  it('consome com GETDEL (leitura e remoção atômicas)', async () => {
    cliente.getDel.mockResolvedValue(JSON.stringify({ userId: '7' }));

    await expect(service.consumir(codigo)).resolves.toEqual({ userId: '7' });
    expect(cliente.getDel).toHaveBeenCalledWith(chaveCodigoAcessoBackoffice(codigo));
  });

  it('retorna null quando o código não existe, expirou ou já foi usado', async () => {
    cliente.getDel.mockResolvedValue(null);

    await expect(service.consumir(codigo)).resolves.toBeNull();
  });

  it.each([['não é json'], [JSON.stringify({ userId: 'x' })], [JSON.stringify({ userId: 7 })]])(
    'retorna null para valor corrompido no cache: %s',
    async (bruto) => {
      cliente.getDel.mockResolvedValue(bruto);

      await expect(service.consumir(codigo)).resolves.toBeNull();
    },
  );
});

import { Cache } from 'cache-manager';
import { CacheModule } from '../cache.module';

function criarCacheComCliente(cliente?: { isOpen: boolean; quit: jest.Mock }): Cache {
  return { store: { client: cliente } } as unknown as Cache;
}

describe('CacheModule', () => {
  it('fecha a conexão do Redis ao destruir o módulo', async () => {
    const cliente = { isOpen: true, quit: jest.fn().mockResolvedValue('OK') };

    await new CacheModule(criarCacheComCliente(cliente)).onModuleDestroy();

    expect(cliente.quit).toHaveBeenCalledTimes(1);
  });

  it('não chama quit quando a conexão já está fechada', async () => {
    const cliente = { isOpen: false, quit: jest.fn() };

    await new CacheModule(criarCacheComCliente(cliente)).onModuleDestroy();

    expect(cliente.quit).not.toHaveBeenCalled();
  });

  it('não falha quando o store não tem cliente Redis (ex.: memória)', async () => {
    await expect(new CacheModule(criarCacheComCliente()).onModuleDestroy()).resolves.toBeUndefined();
  });
});

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

/**
 * Replica o padrão de cache versionado do Laravel (RemessasResponseHelper):
 * cada listagem tem uma "version key"; a chave de cache embute a versão atual.
 * Para invalidar TODAS as entradas de uma listagem basta incrementar a versão
 * (O(1), sem depender de tags de cache).
 */
@Injectable()
export class VersionedCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  md5(value: string): string {
    return createHash('md5').update(value).digest('hex');
  }

  async getVersion(versionKey: string): Promise<number> {
    const current = await this.cache.get<number>(versionKey);
    return current ?? 1;
  }

  /** Incrementa a versão (equivalente a Cache::increment com forever inicial). */
  async bumpVersion(versionKey: string): Promise<number> {
    const current = (await this.cache.get<number>(versionKey)) ?? 1;
    const next = current + 1;
    // ttl 0 = sem expiração (equivalente ao Cache::forever)
    await this.cache.set(versionKey, next, 0);
    return next;
  }

  /**
   * Equivalente a Cache::remember: retorna o valor cacheado ou executa o
   * callback, cacheando o resultado por `ttlSeconds`.
   */
  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }
    const fresh = await factory();
    await this.cache.set(key, fresh, ttlSeconds * 1000);
    return fresh;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return (await this.cache.get<T>(key)) ?? undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds * 1000);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}

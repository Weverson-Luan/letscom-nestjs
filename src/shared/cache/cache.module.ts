import { CACHE_MANAGER, CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { RedisStore, redisStore } from 'cache-manager-redis-yet';
import { VersionedCacheService } from './versioned-cache.service';

/**
 * Cache global via Redis (substitui o driver `database` do Laravel).
 * Fornece o VersionedCacheService que replica a invalidação por version-key
 * das listagens de remessas.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');
        const db = config.get<number>('redis.db');

        return {
          store: await redisStore({
            socket: { host, port },
            password: password || undefined,
            database: db,
          }),
          // ttl padrão (ms) — as listagens passam ttl explícito
          ttl: 0,
        };
      },
    }),
  ],
  providers: [VersionedCacheService],
  exports: [VersionedCacheService, NestCacheModule],
})
export class CacheModule implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * O @nestjs/cache-manager não fecha a conexão do redisStore no app.close():
   * sem isso o processo não encerra (jest e2e fica preso e o shutdown da API trava).
   */
  async onModuleDestroy(): Promise<void> {
    const cliente = (this.cache.store as Partial<RedisStore>).client;
    if (cliente?.isOpen) await cliente.quit();
  }
}

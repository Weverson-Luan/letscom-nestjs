import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
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

        return {
          store: await redisStore({
            socket: { host, port },
            password: password || undefined,
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
export class CacheModule {}

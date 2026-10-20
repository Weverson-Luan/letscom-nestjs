/**
 * IMPORTS
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-redis-yet';

// helpers
import {
  chaveCodigoAcessoBackoffice,
  CodigoAcessoBackofficeCache,
  TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS,
} from './helpers/codigo-acesso-backoffice.helper';

/**
 * Serviço técnico: guarda e consome o código de acesso ao backoffice no Redis.
 * O consumo usa GETDEL (atômico), então duas trocas simultâneas do mesmo código
 * nunca recebem sessão as duas.
 */
@Injectable()
export class CodigoAcessoBackofficeCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /** Depende do store Redis do CacheModule (o cache-manager não expõe GETDEL). */
  private get cliente() {
    return (this.cache.store as RedisStore).client;
  }

  async guardar(codigo: string, valor: CodigoAcessoBackofficeCache): Promise<void> {
    await this.cliente.set(chaveCodigoAcessoBackoffice(codigo), JSON.stringify(valor), {
      EX: TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS,
    });
  }

  /** Lê e apaga o código na mesma operação. Null se não existir ou estiver corrompido. */
  async consumir(codigo: string): Promise<CodigoAcessoBackofficeCache | null> {
    const bruto = await this.cliente.getDel(chaveCodigoAcessoBackoffice(codigo));
    if (!bruto) return null;

    try {
      const valor = JSON.parse(bruto) as Partial<CodigoAcessoBackofficeCache>;
      return typeof valor.userId === 'string' && /^\d+$/.test(valor.userId)
        ? { userId: valor.userId }
        : null;
    } catch {
      return null;
    }
  }
}

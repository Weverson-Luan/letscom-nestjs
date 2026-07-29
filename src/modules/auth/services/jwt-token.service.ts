import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: number | string | bigint;
  tipo_login: 'user' | 'subordinado';
  email: string;
  cliente_id?: number | string | bigint | null;
}

/**
 * Espelha o JWTService do Laravel (firebase/php-jwt): cria o access token
 * HS256 com iat/exp (TTL em dias via jwt.access_ttl_days, default 7).
 */
@Injectable()
export class JwtTokenService {
  constructor(private readonly config: ConfigService) {}

  createToken(payload: AccessTokenPayload): string {
    const days = Math.max(1, this.config.get<number>('jwt.accessTtlDays') ?? 7);
    const algorithm = (this.config.get<string>('jwt.algorithm') ??
      'HS256') as jwt.Algorithm;
    const secret = this.config.get<string>('jwt.secret')!;

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      // coerção de BigInt (ids do Prisma) para número no JWT
      sub: typeof payload.sub === 'bigint' ? Number(payload.sub) : payload.sub,
      cliente_id:
        typeof payload.cliente_id === 'bigint'
          ? Number(payload.cliente_id)
          : payload.cliente_id,
      iat: now,
      exp: now + days * 24 * 60 * 60,
    };

    return jwt.sign(fullPayload, secret, { algorithm });
  }
}

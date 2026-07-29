import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import {
  RefreshTokenRepository,
  TOKENABLE_SUBORDINADO,
  TOKENABLE_USER,
} from '../repositories/refresh-token.repository';
import { JwtTokenService } from './jwt-token.service';

export type Tokenable =
  | { kind: 'user'; id: bigint; email: string; ativo: boolean }
  | { kind: 'subordinado'; id: bigint; email: string; ativo: boolean; clienteId: bigint };

/**
 * Espelha o RefreshTokenService do Laravel: refresh token opaco (32 bytes),
 * persistindo apenas o hash SHA-256; rotação com revogação em transação.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RefreshTokenRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly config: ConfigService,
  ) {}

  private hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }

  private tokenableType(kind: 'user' | 'subordinado'): string {
    return kind === 'subordinado' ? TOKENABLE_SUBORDINADO : TOKENABLE_USER;
  }

  /** Emite um refresh token opaco e persiste o hash. Retorna o token em claro. */
  async issue(tokenable: Tokenable): Promise<string> {
    const plain = randomBytes(32).toString('hex');
    const hash = this.hash(plain);
    const days = Math.max(1, this.config.get<number>('jwt.refreshTtlDays') ?? 30);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.repository.create({
      tokenableType: this.tokenableType(tokenable.kind),
      tokenableId: tokenable.id,
      tokenHash: hash,
      expiresAt,
    });

    return plain;
  }

  async revokeAll(tokenable: Tokenable): Promise<void> {
    await this.repository.revokeAll(this.tokenableType(tokenable.kind), tokenable.id);
  }

  /**
   * Valida o refresh, revoga o registro atual e emite novo access + refresh.
   * Lança BadRequestException (mapeado para 401 no controller) em caso inválido.
   */
  async rotate(plainRefreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const hash = this.hash(plainRefreshToken);
    const record = await this.repository.findValidByHash(hash);

    if (!record) {
      throw new BadRequestException('Refresh token inválido ou expirado!');
    }

    const tokenable = await this.resolveTokenable(record.tokenableType, record.tokenableId);

    if (!tokenable) {
      await this.repository.revokeById(record.id);
      throw new BadRequestException('Usuário não encontrado!');
    }

    if (!tokenable.ativo) {
      throw new BadRequestException('Usuário desativado!');
    }

    return this.prisma.$transaction(async () => {
      await this.repository.revokeById(record.id);

      const accessToken = this.jwtTokenService.createToken(
        tokenable.kind === 'subordinado'
          ? {
              sub: tokenable.id,
              tipo_login: 'subordinado',
              email: tokenable.email,
              cliente_id: tokenable.clienteId,
            }
          : { sub: tokenable.id, tipo_login: 'user', email: tokenable.email },
      );

      const newRefresh = await this.issue(tokenable);

      return { access_token: accessToken, refresh_token: newRefresh };
    });
  }

  private async resolveTokenable(
    tokenableType: string,
    tokenableId: bigint,
  ): Promise<Tokenable | null> {
    if (tokenableType === TOKENABLE_SUBORDINADO) {
      const uc = await this.prisma.userCliente.findUnique({ where: { id: tokenableId } });
      if (!uc) return null;
      return {
        kind: 'subordinado',
        id: uc.id,
        email: uc.email,
        ativo: uc.ativo,
        clienteId: uc.clienteId,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: tokenableId } });
    if (!user) return null;
    return { kind: 'user', id: user.id, email: user.email, ativo: user.ativo };
  }
}

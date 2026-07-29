import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number | string;
  tipo_login: 'user' | 'subordinado';
  email: string;
  cliente_id?: number | string | null;
  iat?: number;
  exp?: number;
}

/**
 * Estratégia JWT (HS256) espelhando o AuthenticateWithJWT do Laravel:
 * resolve `User` (tipo_login=user) OU `UserCliente` (subordinado) pelo claim
 * `sub`, discriminando pelo `tipo_login`. Carrega as roles para o RolesGuard.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
      algorithms: [config.get<string>('jwt.algorithm') ?? 'HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const sub = BigInt(payload.sub);

    if (payload.tipo_login === 'subordinado') {
      const userCliente = await this.prisma.userCliente.findUnique({
        where: { id: sub },
        include: { rolePivots: { include: { role: true } } },
      });

      if (!userCliente) {
        throw new UnauthorizedException('Subordinado não encontrado');
      }

      return {
        id: userCliente.id,
        email: userCliente.email,
        nome: userCliente.nome,
        ativo: userCliente.ativo,
        tipoLogin: 'subordinado',
        clienteId: userCliente.clienteId,
        roles: userCliente.rolePivots.map((p) => p.role.nome),
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: { rolePivots: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      ativo: user.ativo,
      tipoLogin: 'user',
      clienteId: null,
      roles: user.rolePivots.map((p) => p.role.nome),
    };
  }
}

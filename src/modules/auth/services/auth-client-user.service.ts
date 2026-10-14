/**
 * IMPORTS
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// service / prisma
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories / role user
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// shared / auth
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';

// services
import { JwtTokenService } from './jwt-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthSubordinateUserService } from './auth-subordinate-user.service';

// utils / hash
import { HashService } from 'src/shared/utils/hash.service';

// mappers
import { userDesactiveMappers } from './helpers/user-desactive.';
import { getClientConsultantMappers } from './helpers/get-client-consultant';

// typings
import { LoginDto } from '../dto/login.dto';

/**
 * Autentica um usuário interno (users) e retorna os dados do usuário + access/refresh token no mesmo formato do Laravel.
 */
@Injectable()
export class AuthClientUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly config: ConfigService,
    private readonly roleUserRepo: RoleUserRepository,
    private readonly featureGate: FeatureGateService,
    private readonly authSubordinateUserService: AuthSubordinateUserService,
  ) {}

  async execute(dto: LoginDto) {
    // tenta autenticar como usuário interno- clientes (users) se falhar, tenta como usuário subordinado (users_cliente)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (user && (await this.hash.check(dto.senha, user.senha))) {
      if (!user.ativo) {
        throw userDesactiveMappers();
      }

      const role = await this.roleUserRepo.findPrimaryRoleForUser(user.id);
      const roleName = role?.nome?.toLowerCase() ?? '';
      if (
        this.config.get<boolean>('auth.bloqueioLoginClienteSubordinado') &&
        roleName === 'cliente'
      ) {
        throw this.respostaInstabilidade();
      }

      const token = this.jwtTokenService.createToken({
        sub: user.id,
        tipo_login: 'user',
        email: user.email,
      });

      const refreshToken = await this.refreshTokenService.issue({
        kind: 'user',
        id: user.id,
        email: user.email,
        ativo: user.ativo,
      });

      const consultor = await getClientConsultantMappers(this.prisma, user.id);

      const features = await this.featureGate.listarKeysHabilitadas({
        id: user.id,
        tipoLogin: 'user',
        roles: await this.roleUserRepo.findRoleNamesForUser(user.id),
      });

      return {
        code: 200,
        message: 'Usuário logado com sucesso!',
        data: {
          id: user.id,
          tipo_login: 'user',
          nome: user.nome,
          email: user.email,
          documento: user.documento ?? null,
          tipo_pessoa: user.tipoPessoa,
          consultor,
          roles: role,
          features,
        },
        access_token: token,
        refresh_token: refreshToken,
      };
    }

    // credenciais não conferem com users: tenta users_cliente (lança 401 se também falhar)
    return this.authSubordinateUserService.execute(dto);
  }

  /** lancar o error 422 - UNPROCESSABLE ENTITY */
  private respostaInstabilidade() {
    const msg =
      this.config.get<string>('auth.mensagemInstabilidade') ??
      'Estamos enfrentando uma instabilidade temporária em nosso sistema.';

    return new HttpException(
      {
        code: 422,
        message: msg,
        errors: { sistema: msg },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

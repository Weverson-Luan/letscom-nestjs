/**
 * IMPORTS
 */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

// service / prisma
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories / role user
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// services
import { JwtTokenService } from './jwt-token.service';
import { RefreshTokenService } from './refresh-token.service';

// utils / hash
import { HashService } from 'src/shared/utils/hash.service';

// mappers
import { serializeUser } from '../mappers/auth-response.mapper';
import { userDesactiveMappers } from './helpers/user-desactive.';
import { getClientConsultantMappers } from './helpers/get-client-consultant.';

// typings
import { LoginDto } from '../dto/login.dto';

/**
 * Autentica um usuário subordinado (users_cliente) e retorna os dados do usuário + access/refresh token no mesmo formato do Laravel.
 */
@Injectable()
export class AuthSubordinateUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly roleUserRepo: RoleUserRepository,
  ) {}

  async execute(dto: LoginDto) {

    // tenta autenticar como usuário subordinado (users_cliente)
    const clienteUser = await this.prisma.userCliente.findFirst({
      where: { email: dto.email },
      include: { clientePrincipal: true },
    });

    const checkPassword = (await this.hash.check(dto.senha, clienteUser?.senha! ?? false))

    if (clienteUser && checkPassword) {
      
      if (!clienteUser.ativo) {
        throw userDesactiveMappers();
      }

      const clientePrincipal = clienteUser.clientePrincipal;
      const consultor = clientePrincipal
        ? await getClientConsultantMappers(this.prisma, clientePrincipal.id)
        : null;


      const token = this.jwtTokenService.createToken({
        sub: clienteUser.id,
        tipo_login: 'subordinado',
        email: clienteUser.email,
        cliente_id: clientePrincipal?.id ?? null,
      });


      const refreshToken = await this.refreshTokenService.issue({
        kind: 'subordinado',
        id: clienteUser.id,
        email: clienteUser.email,
        ativo: clienteUser.ativo,
        clienteId: clienteUser.clienteId,
      });

      const role = await this.roleUserRepo.findPrimaryRoleForUserCliente(
        clienteUser.id,
      );

      return {
        code: 200,
        message: 'Usuário subordinado logado com sucesso!',
        data: {
          id: clienteUser.id,
          tipo_login: 'subordinado',
          nome: clienteUser.nome,
          email: clienteUser.email,
          documento: clienteUser.documento ?? null,
          cliente_principal: serializeUser(clientePrincipal),
          roles: role,
          consultor,
        },
        access_token: token,
        refresh_token: refreshToken,
      };
    }

    // falha ao autenticar lancar o error 401 - UNAUTHORIZED
    throw new HttpException(
      {
        code: 401,
        status: 'error',
        error:
          'Usuário ou senha inválidos. Verifique suas credenciais e tente novamente!',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

}

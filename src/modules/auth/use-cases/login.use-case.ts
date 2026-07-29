import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { HashService } from 'src/shared/utils/hash.service';
import { LoginDto } from '../dto/login.dto';
import { serializeUser } from '../mappers/auth-response.mapper';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';

/**
 * Espelha AuthController::login do Laravel: tenta autenticar como `User`
 * (interno) e, se falhar, como `UserCliente` (subordinado). Retorna os dados
 * do usuário + access/refresh token no mesmo formato do Laravel.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(dto: LoginDto) {
    // 1) Tenta como usuário interno (users)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { rolePivots: { include: { role: true } } },
    });

    if (user && (await this.hash.check(dto.senha, user.senha))) {
      if (!user.ativo) {
        throw this.usuarioDesativado();
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

      const consultor = await this.buscarConsultorDoCliente(user.id);
      const role = user.rolePivots[0]?.role ?? null;

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
        },
        access_token: token,
        refresh_token: refreshToken,
      };
    }

    // 2) Tenta como subordinado (users_cliente)
    const clienteUser = await this.prisma.userCliente.findFirst({
      where: { email: dto.email },
      include: {
        rolePivots: { include: { role: true } },
        clientePrincipal: true,
      },
    });

    if (clienteUser && (await this.hash.check(dto.senha, clienteUser.senha))) {
      if (!clienteUser.ativo) {
        throw this.usuarioDesativado();
      }

      const clientePrincipal = clienteUser.clientePrincipal;
      const consultor = clientePrincipal
        ? await this.buscarConsultorDoCliente(clientePrincipal.id)
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

      const role = clienteUser.rolePivots[0]?.role ?? null;

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

    // 3) Falha
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

  /** Primeiro consultor vinculado ao cliente (cliente_consultor). */
  private async buscarConsultorDoCliente(clienteId: bigint) {
    const vinculo = await this.prisma.clienteConsultor.findFirst({
      where: { clienteId },
      include: { consultor: true },
      orderBy: { id: 'asc' },
    });
    return serializeUser(vinculo?.consultor ?? null);
  }

  private usuarioDesativado() {
    return new HttpException(
      {
        code: 422,
        message: 'Usuário desativado',
        errors: {
          ativo: 'Este usuário está desativado e não pode acessar o sistema!',
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';

// repositories
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';

// shared / auth
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature } from 'src/shared/auth/features';

// services
import { JwtTokenService } from './jwt-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { CodigoAcessoBackofficeCacheService } from './codigo-acesso-backoffice-cache.service';

// helpers / mappers / exceptions
import { userDesactiveMappers } from './helpers/user-desactive.';
import { mapearRespostaLogin, serializeUser } from '../mappers/auth-response.mapper';
import { AcessoBackofficeNegadoException } from '../exceptions/acesso-backoffice-negado.exception';
import { CodigoAcessoBackofficeInvalidoException } from '../exceptions/codigo-acesso-backoffice-invalido.exception';

// typings
import { TrocarCodigoAcessoBackofficeDto } from '../dto/trocar-codigo-acesso-backoffice.dto';

/**
 * Troca o código de uso único (gerado no portal) por uma sessão do backoffice:
 * mesma resposta do `POST /login`, com access/refresh token novos.
 * O código é consumido (GETDEL) antes de qualquer validação e expira em 60s.
 */
@Injectable()
export class TrocarCodigoAcessoBackofficeService {
  constructor(
    private readonly codigoCache: CodigoAcessoBackofficeCacheService,
    private readonly usuarioRepo: UsuarioInternoRepository,
    private readonly roleUserRepo: RoleUserRepository,
    private readonly featureGate: FeatureGateService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(dto: TrocarCodigoAcessoBackofficeDto) {
    const valor = await this.codigoCache.consumir(dto.codigo);
    if (!valor) {
      throw new CodigoAcessoBackofficeInvalidoException();
    }

    const user = await this.usuarioRepo.buscarPorId(BigInt(valor.userId));
    if (!user) {
      throw new CodigoAcessoBackofficeInvalidoException();
    }

    if (!user.ativo) {
      throw userDesactiveMappers();
    }

    const roles = await this.roleUserRepo.findRoleNamesForUser(user.id);
    const subject = { id: user.id, tipoLogin: 'user' as const, roles };
    const features = await this.featureGate.listarKeysHabilitadas(subject);

    // revalida o acesso: papel/feature podem ter mudado depois da geração do código
    if (
      this.featureGate.isUsuarioCliente(subject) ||
      !features.includes(Feature.ACESSAR_BACKOFFICE)
    ) {
      throw new AcessoBackofficeNegadoException();
    }

    const accessToken = this.jwtTokenService.createToken({
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

    const role = await this.roleUserRepo.findPrimaryRoleForUser(user.id);
    const consultor = serializeUser(await this.usuarioRepo.buscarConsultorDoCliente(user.id));

    return mapearRespostaLogin({ user, consultor, role, features, accessToken, refreshToken });
  }
}

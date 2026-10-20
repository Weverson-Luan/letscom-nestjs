/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

// shared / auth
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';

// services
import { CodigoAcessoBackofficeCacheService } from './codigo-acesso-backoffice-cache.service';

// helpers / mappers / exceptions
import { TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS } from './helpers/codigo-acesso-backoffice.helper';
import { mapearCodigoAcessoBackoffice } from '../mappers/auth-response.mapper';
import { AcessoBackofficeNegadoException } from '../exceptions/acesso-backoffice-negado.exception';

// typings
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/**
 * Gera um código de uso único para o usuário logado no portal abrir o backoffice
 * já autenticado. Portal e backoffice ficam em origens diferentes, então não
 * compartilham localStorage/cookies: o código é trocado por uma sessão própria
 * do backoffice em `POST /auth/codigo-acesso-backoffice/trocar`.
 */
@Injectable()
export class GerarCodigoAcessoBackofficeService {
  constructor(
    private readonly codigoCache: CodigoAcessoBackofficeCacheService,
    private readonly featureGate: FeatureGateService,
  ) {}

  async execute(user: AuthUser) {
    // cliente/subordinado nunca acessa o backoffice, mesmo com a feature liberada por engano
    if (user.tipoLogin !== 'user' || this.featureGate.isUsuarioCliente(user)) {
      throw new AcessoBackofficeNegadoException();
    }

    const codigo = randomBytes(32).toString('hex');
    await this.codigoCache.guardar(codigo, { userId: user.id.toString() });

    return mapearCodigoAcessoBackoffice(codigo, TTL_CODIGO_ACESSO_BACKOFFICE_SEGUNDOS);
  }
}

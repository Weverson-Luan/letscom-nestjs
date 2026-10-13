import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGateService } from '../auth/feature-gate.service';
import { MENSAGEM_SEM_PERMISSAO } from '../auth/features';
import { AuthUser } from '../decorators/current-user.decorator';
import { FEATURES_KEY } from '../decorators/features.decorator';

/**
 * Guard de autorização por feature flag, espelhando o middleware CheckFeature
 * do Laravel (`feature:key_a,key_b`). Roda depois do RolesGuard; sem
 * @RequireFeatures() na rota, não restringe.
 */
@Injectable()
export class FeaturesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureGate: FeatureGateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const features = this.reflector.getAllAndOverride<string[]>(FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!features || features.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;

    if (!(await this.featureGate.permite(user, features))) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
    }

    return true;
  }
}

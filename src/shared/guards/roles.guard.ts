import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Guard de autorização por role, espelhando o middleware CheckRole do Laravel
 * (`role:admin,producao,...`): só permite se o usuário tiver ao menos uma das
 * roles exigidas. Sem @Roles() na rota, não restringe.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    const autorizado =
      !!user && user.roles?.some((role) => requiredRoles.includes(role));

    if (!autorizado) {
      throw new ForbiddenException(
        'Usuário não possui permissão para acessar esta rota.',
      );
    }

    return true;
  }
}

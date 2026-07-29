import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles';

export const ROLES_KEY = 'roles';

/**
 * Equivalente ao middleware `role:admin,producao,...` do Laravel.
 * Uso: @Roles(Role.ADMIN, Role.PRODUCAO)
 */
export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);

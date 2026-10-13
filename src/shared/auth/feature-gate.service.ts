import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Identidade mínima para resolver features (AuthUser ou usuário do login). */
export interface FeatureSubject {
  id: bigint;
  tipoLogin: 'user' | 'subordinado';
  /** nomes das roles (coluna roles.nome) */
  roles: string[];
}

const ROLES_CLIENTE = ['cliente', 'subordinado'];

/**
 * Regras de acesso por feature flag, válidas para todos os usuários (internos,
 * clientes e subordinados). O acesso é definido apenas por `feature_flags.tipo_usuario`.
 */
@Injectable()
export class FeatureGateService {
  /** Cache por request: o guard e os controllers consultam as features várias vezes. */
  private readonly cache = new WeakMap<object, Promise<string[]>>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Keys das feature flags liberadas para o usuário.
   *
   * A flag precisa estar ativa e a role do usuário precisa estar em `tipo_usuario`.
   */
  async listarKeysHabilitadas(user: FeatureSubject): Promise<string[]> {
    const roles = user.roles.map((role) => role.trim().toLowerCase());

    const flags = await this.prisma.featureFlag.findMany({
      where: { ativo: true },
      orderBy: { key: 'asc' },
      select: { id: true, key: true, tipoUsuario: true },
    });

    return flags
      .filter((flag) => {
        const tipos = (flag.tipoUsuario ?? '').split(',').map((tipo) => tipo.trim());
        return roles.some((role) => tipos.includes(role));
      })
      .map((flag) => flag.key);
  }

  featuresDo(user: FeatureSubject | null | undefined): Promise<string[]> {
    if (!user) return Promise.resolve([]);

    let features = this.cache.get(user);
    if (!features) {
      features = this.listarKeysHabilitadas(user);
      this.cache.set(user, features);
    }
    return features;
  }

  /** Libera quando o usuário tem pelo menos uma das features. */
  async permite(
    user: FeatureSubject | null | undefined,
    keys: readonly string[],
  ): Promise<boolean> {
    const features = await this.featuresDo(user);
    return keys.some((key) => features.includes(key));
  }

  /** Cliente ou subordinado (inclui o login de users_cliente). */
  isUsuarioCliente(user: Pick<FeatureSubject, 'tipoLogin' | 'roles'> | null | undefined): boolean {
    if (!user) return false;
    if (user.tipoLogin === 'subordinado') return true;

    const roles = user.roles.map((role) => role.trim().toLowerCase());
    return roles.length > 0 && roles.every((role) => ROLES_CLIENTE.includes(role));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureGateService, FeatureSubject } from 'src/shared/auth/feature-gate.service';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserFeatureFlagRepository } from '../repositories/user-feature-flag.repository';

@Injectable()
export class UserFeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UserFeatureFlagRepository,
    private readonly featureGate: FeatureGateService,
  ) {}

  async listarPorUsuario(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return this.repository.listarPorUsuario(userId);
  }

  async sincronizar(userId: bigint, flags: { feature_flag_id: number; ativo: boolean }[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    await this.validarFlags(flags);
    await this.repository.sincronizar(userId, flags);
    return this.repository.listarPorUsuario(userId);
  }

  /** Keys habilitadas do usuário autenticado (vínculo direto ou role em `tipo_usuario`). */
  listarHabilitadasDoUsuarioAutenticado(user: FeatureSubject): Promise<string[]> {
    return this.featureGate.featuresDo(user);
  }

  private async validarFlags(flags: { feature_flag_id: number; ativo: boolean }[]) {
    const ids = [...new Set(flags.map((f) => f.feature_flag_id))].map((i) => BigInt(i));
    const existentes = await this.prisma.featureFlag.count({ where: { id: { in: ids } } });
    if (existentes !== ids.length) {
      throw new BusinessException('Uma ou mais feature flags informadas não existem.');
    }
  }
}

import { Injectable } from '@nestjs/common';
import { FeatureGateService, FeatureSubject } from 'src/shared/auth/feature-gate.service';

@Injectable()
export class UserFeatureFlagService {
  constructor(private readonly featureGate: FeatureGateService) {}

  /** Keys habilitadas do usuário autenticado (role em `tipo_usuario`). */
  listarHabilitadasDoUsuarioAutenticado(user: FeatureSubject): Promise<string[]> {
    return this.featureGate.featuresDo(user);
  }
}

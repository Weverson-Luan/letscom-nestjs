/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';

// repository
import { BuscarDadosUsuarioRepository } from '../repositories/buscar-dados-usuario.repository';

// typings
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/** Espelha UserService::buscarDadosUsuario (dashboard do usuário autenticado). */
@Injectable()
export class BuscarDadosUsuarioService {
  constructor(
    private readonly repository: BuscarDadosUsuarioRepository,
    private readonly featureGate: FeatureGateService,
  ) {}

  async execute(authUser: AuthUser) {
    const totalRemessa = await this.repository.contarRemessasEmAndamento(authUser.id);
    const totalRemessaProduzidas = await this.repository.contarRemessasProduzidas(authUser.id);

    const features = await this.featureGate.featuresDo(authUser);

    return {
      id: authUser.id,
      nome: authUser.nome,
      email: authUser.email,
      remessas_em_andamento: totalRemessa,
      total_remessas_produzidas: totalRemessaProduzidas,
      features,
    };
  }
}

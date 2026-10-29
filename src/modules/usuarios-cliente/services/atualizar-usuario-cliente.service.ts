/**
 * IMPORTS
 */
import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { HashService } from 'src/shared/utils/hash.service';

// repository
import { AtualizarUsuarioClienteRepository } from '../repositories/atualizar-usuario-cliente.repository';

// typings
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/**
 * Atualiza um usuário subordinado. As features exigidas dependem dos campos enviados
 * (403 antes do 404, como no Laravel):
 * - `ativo` exige `inativar_usuario_cliente`;
 * - os demais campos exigem `editar_usuarios_cliente`.
 */
@Injectable()
export class AtualizarUsuarioClienteService {
  constructor(
    private readonly repository: AtualizarUsuarioClienteRepository,
    private readonly hash: HashService,
    private readonly featureGate: FeatureGateService,
  ) {}

  async execute(autenticado: AuthUser, id: bigint, dados: Record<string, any>) {
    if (!(await this.podeAtualizarCampos(autenticado, dados))) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
    }

    const usuario = await this.repository.buscarPorId(id);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', HttpStatus.NOT_FOUND);
    }

    const dadosAtualizacao: Prisma.UserClienteUpdateInput = {};
    if (dados.email !== undefined) dadosAtualizacao.email = dados.email;
    if (dados.nome !== undefined) dadosAtualizacao.nome = dados.nome;
    if (dados.documento !== undefined) dadosAtualizacao.documento = dados.documento;
    if (dados.ativo !== undefined) dadosAtualizacao.ativo = dados.ativo;
    if (dados.senha) dadosAtualizacao.senha = await this.hash.make(String(dados.senha));

    return this.repository.atualizar(id, dadosAtualizacao);
  }

  private async podeAtualizarCampos(
    autenticado: AuthUser,
    dados: Record<string, unknown>,
  ): Promise<boolean> {
    const campos = Object.keys(dados).filter((campo) => dados[campo] !== undefined);
    const exigidas: string[][] = [];
    if (campos.includes('ativo')) exigidas.push([Feature.INATIVAR_USUARIO_CLIENTE]);
    if (campos.some((campo) => campo !== 'ativo')) exigidas.push([Feature.EDITAR_USUARIOS_CLIENTE]);

    for (const features of exigidas) {
      if (!(await this.featureGate.permite(autenticado, features))) return false;
    }
    return true;
  }
}

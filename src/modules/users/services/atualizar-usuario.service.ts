/**
 * IMPORTS
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { HashService } from 'src/shared/utils/hash.service';

// repository
import { AtualizarUsuarioRepository } from '../repositories/atualizar-usuario.repository';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

// typings
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

/**
 * Atualiza os dados de um usuário. Espelha UserController::podeAtualizarUsuario
 * (404 se não existir, 403 se não puder):
 * - O próprio usuário pode editar os seus dados (exceto ativar/inativar a si mesmo).
 * - O subordinado pode editar os dados do cliente ao qual pertence.
 * - Usuários internos só editam clientes, com `editar_cliente` e/ou `inativar_cliente`.
 */
@Injectable()
export class AtualizarUsuarioService {
  constructor(
    private readonly repository: AtualizarUsuarioRepository,
    private readonly hash: HashService,
    private readonly roleUserRepo: RoleUserRepository,
    private readonly featureGate: FeatureGateService,
  ) {}

  async execute(autenticado: AuthUser, id: bigint, data: Record<string, any>) {
    const user = await this.repository.buscarPorId(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (!(await this.podeAtualizarUsuario(autenticado, id, data))) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.documento !== undefined) updateData.documento = data.documento;
    if (data.telefone !== undefined) updateData.telefone = data.telefone;
    if (data.tipo_pessoa !== undefined) updateData.tipoPessoa = data.tipo_pessoa;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.senha) updateData.senha = await this.hash.make(data.senha);

    if (data.tipo_entrega_id !== undefined) {
      await this.repository.substituirTipoEntrega(id, BigInt(data.tipo_entrega_id));
    }

    await this.repository.atualizar(id, updateData);
    return true;
  }

  private async podeAtualizarUsuario(
    autenticado: AuthUser,
    usuarioId: bigint,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const campos = Object.keys(data).filter((campo) => data[campo] !== undefined);
    const alteraAtivo = campos.includes('ativo');
    const alteraOutrosCampos = campos.some((campo) => campo !== 'ativo');

    if (autenticado.tipoLogin === 'subordinado') {
      return autenticado.clienteId === usuarioId && !alteraAtivo;
    }

    if (autenticado.id === usuarioId) {
      return !alteraAtivo;
    }

    const usuarioAlvo = {
      tipoLogin: 'user' as const,
      roles: await this.roleUserRepo.findRoleNamesForUser(usuarioId),
    };
    if (
      this.featureGate.isUsuarioCliente(autenticado) ||
      !this.featureGate.isUsuarioCliente(usuarioAlvo)
    ) {
      return false;
    }

    if (alteraAtivo && !(await this.featureGate.permite(autenticado, [Feature.INATIVAR_CLIENTE]))) {
      return false;
    }

    return !alteraOutrosCampos || this.featureGate.permite(autenticado, [Feature.EDITAR_CLIENTE]);
  }
}

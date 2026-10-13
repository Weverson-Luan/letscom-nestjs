import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { Feature, MENSAGEM_SEM_PERMISSAO } from 'src/shared/auth/features';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { buildPagination } from 'src/shared/utils/api-response';
import { HashService } from 'src/shared/utils/hash.service';
import { resolvePagination } from 'src/shared/database/pagination';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { UsersResponseMapper } from '../mappers/users-response.mapper';
import { UserFeatureFlagService } from './user-feature-flag.service';
import { RoleUserRepository } from 'src/shared/repositories/role-user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UserRepository,
    private readonly mapper: UsersResponseMapper,
    private readonly hash: HashService,
    private readonly featureFlagService: UserFeatureFlagService,
    private readonly roleUserRepo: RoleUserRepository,
    private readonly featureGate: FeatureGateService,
  ) {}

  async list(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginate({
      search: query.search as string,
      sortBy: (query.sort_by as string) ?? 'createdAt',
      order: (query.order as 'asc' | 'desc') ?? 'desc',
      skip,
      take,
    });

    return {
      data: await this.mapper.mapUsersList(data),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async listConsultores(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginateConsultores({
      search: query.search as string,
      sortBy: (query.sort_by as string) ?? 'createdAt',
      order: (query.order as 'asc' | 'desc') ?? 'desc',
      skip,
      take,
    });

    return { data, pagination: buildPagination(total, page, perPage) };
  }

  async buscarUsuarioComTipoEntrega(id: bigint) {
    const user = await this.repository.findByIdWithTipoEntrega(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return this.mapper.mapSingleUser(user);
  }

  /** Espelha UserService::buscarDadosUsuario (dashboard do usuário autenticado). */
  async buscarDadosUsuario(authUser: AuthUser) {
    const totalRemessa = await this.prisma.remessa.count({
      where: {
        clienteId: authUser.id,
        status: { notIn: ['concluida', 'concluído', 'cancelada'] },
      },
    });
    const totalRemessaProduzidas = await this.prisma.remessa.count({
      where: { clienteId: authUser.id, status: 'pedido_liberado' },
    });

    const features = await this.featureFlagService.listarHabilitadasDoUsuarioAutenticado(authUser);

    return {
      id: authUser.id,
      nome: authUser.nome,
      email: authUser.email,
      remessas_em_andamento: totalRemessa,
      total_remessas_produzidas: totalRemessaProduzidas,
      features,
    };
  }

  /** Cria usuário + sincroniza role/consultor/tipo_entrega (transação). */
  async create(data: Record<string, any>) {
    const roleId = data.roles ?? null;
    const consultorId = data.consultor_id ?? null;
    const tipoEntregaId = data.tipo_entrega_id ?? null;

    const senha = data.senha ? await this.hash.make(data.senha) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha: senha!,
          documento: data.documento ?? null,
          telefone: data.telefone,
          tipoPessoa: data.tipo_pessoa,
          ativo: data.ativo ?? true,
        },
      });

      if (roleId) {
        await this.roleUserRepo.attachToUser(tx, user.id, BigInt(roleId), true);
      }
      if (consultorId) {
        await tx.clienteConsultor.create({
          data: { clienteId: user.id, consultorId: BigInt(consultorId) },
        });
      }
      if (tipoEntregaId) {
        await tx.tipoEntregaUser.create({
          data: { clienteId: user.id, tipoEntregaId: BigInt(tipoEntregaId) },
        });
      }

      return user;
    });
  }

  async update(id: bigint, data: Record<string, any>) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const updateData: Prisma.UserUpdateInput = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.documento !== undefined) updateData.documento = data.documento;
    if (data.telefone !== undefined) updateData.telefone = data.telefone;
    if (data.tipo_pessoa !== undefined) updateData.tipoPessoa = data.tipo_pessoa;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.senha) updateData.senha = await this.hash.make(data.senha);

    if (data.tipo_entrega_id !== undefined) {
      await this.prisma.tipoEntregaUser.deleteMany({ where: { clienteId: id } });
      await this.prisma.tipoEntregaUser.create({
        data: { clienteId: id, tipoEntregaId: BigInt(data.tipo_entrega_id) },
      });
    }

    await this.repository.update(id, updateData);
    return true;
  }

  /**
   * Espelha UserController::podeAtualizarUsuario (404 se não existir, 403 se não puder):
   * - O próprio usuário pode editar os seus dados (exceto ativar/inativar a si mesmo).
   * - O subordinado pode editar os dados do cliente ao qual pertence.
   * - Usuários internos só editam clientes, com `editar_cliente` e/ou `inativar_cliente`.
   */
  async assertPodeAtualizar(autenticado: AuthUser, id: bigint, data: Record<string, unknown>) {
    const usuario = await this.repository.findById(id);
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    if (!(await this.podeAtualizarUsuario(autenticado, id, data))) {
      throw new ForbiddenException(MENSAGEM_SEM_PERMISSAO);
    }
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

  async delete(id: bigint) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    await this.repository.softDelete(id);
    return true;
  }
}

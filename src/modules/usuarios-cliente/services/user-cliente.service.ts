import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { HashService } from 'src/shared/utils/hash.service';
import { mapUserCliente } from '../mappers/user-cliente.mapper';
import { UserClienteRepository } from '../repositories/user-cliente.repository';

/** Espelha o UserClienteService (usuários subordinados de um cliente). */
@Injectable()
export class UserClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UserClienteRepository,
    private readonly hash: HashService,
  ) {}

  listarTodos() {
    return this.repository.findAll();
  }

  buscar(id: bigint) {
    return this.repository.findById(id);
  }

  async listarPorCliente(clienteId: bigint, query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginateByCliente({
      clienteId,
      search: query.search as string,
      sortBy: query.sort_by as string,
      order: (query.order as 'asc' | 'desc') ?? 'desc',
      skip,
      take,
    });
    return {
      data: data.map(mapUserCliente),
      pagination: buildPagination(total, page, perPage),
    };
  }

  /** Cria o usuário subordinado + atribui role (transacional). */
  async create(data: Record<string, any>) {
    if (!data.cliente_id) {
      throw new BusinessException(
        'O cliente_id é obrigatório.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!data.email) {
      throw new BusinessException(
        'O e-mail é obrigatório.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!data.senha) {
      throw new BusinessException(
        'A senha é obrigatória.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const senha = await this.hash.make(String(data.senha));

    return this.prisma.$transaction(async (tx) => {
      if (await tx.userCliente.findUnique({ where: { email: data.email } })) {
        throw new BusinessException(
          'E-mail já cadastrado no sistema.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      if (
        data.documento &&
        (await tx.userCliente.findFirst({ where: { documento: data.documento } }))
      ) {
        throw new BusinessException(
          'Documento (CPF/CNPJ) já cadastrado no sistema.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const user = await tx.userCliente.create({
        data: {
          clientePrincipal: { connect: { id: BigInt(data.cliente_id) } },
          email: data.email,
          nome: data.nome ?? null,
          senha,
          documento: data.documento ?? null,
          ativo: data.ativo ?? true,
        },
      });

      let roleId: bigint;
      if (data.role_id) {
        roleId = BigInt(data.role_id);
      } else {
        const rolePadrao = await tx.role.findFirst({
          where: { nome: { in: ['subordinado', 'Subordinado'] } },
        });
        if (!rolePadrao) {
          throw new Error('Role padrão "Subordinado" não encontrada.');
        }
        roleId = rolePadrao.id;
      }

      await tx.roleUser.create({
        data: { clientSubId: user.id, roleId, ativo: true },
      });

      return user;
    });
  }

  async update(id: bigint, data: Record<string, any>) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new BusinessException(
        'Usuário não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    const updateData: Prisma.UserClienteUpdateInput = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.documento !== undefined) updateData.documento = data.documento;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.senha) updateData.senha = await this.hash.make(String(data.senha));

    return this.repository.update(id, updateData);
  }

  async delete(id: bigint) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new BusinessException(
        'Usuário não encontrado.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const vinculadas = await this.repository.countRemessasSubordinado(id);
    if (vinculadas > 0) {
      throw new BusinessException(
        'Não é possível excluir este usuário porque ele possui remessas vinculadas no sistema. Utilize a opção de inativar o usuário para bloquear o acesso sem perder o histórico.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.repository.delete(id);
  }
}

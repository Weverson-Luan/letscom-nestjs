import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const LIST_INCLUDE = {
  clienteConsultores: { include: { consultor: true }, orderBy: { id: 'asc' as const } },
  produtosVinculados: { include: { produto: true } },
  tiposEntregaUser: { include: { tipoEntrega: true } },
  enderecos: true,
} satisfies Prisma.UserInclude;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildSearchWhere(search?: string): Prisma.UserWhereInput | undefined {
    if (!search) return undefined;
    const or: Prisma.UserWhereInput[] = [
      { nome: { contains: search } },
      { email: { contains: search } },
      { documento: { contains: search } },
      { telefone: { contains: search } },
    ];
    if (/^\d+$/.test(search)) {
      or.push({ id: BigInt(search) });
    }
    return { OR: or };
  }

  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where = this.buildSearchWhere(params.search);
    const orderBy = { [params.sortBy ?? 'createdAt']: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        include: LIST_INCLUDE,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async paginateConsultores(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.UserWhereInput = {
      rolePivots: {
        some: {
          role: { OR: [{ nome: { contains: 'Consultor' } }, { nome: 'admin' }] },
        },
      },
    };
    if (params.search) {
      where.nome = { contains: params.search };
    }

    const orderBy = { [params.sortBy ?? 'createdAt']: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy, skip: params.skip, take: params.take }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  findByIdWithTipoEntrega(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        modelosTecnicos: true,
        tiposEntregaUser: { include: { tipoEntrega: true } },
      },
    });
  }

  findById(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  update(id: bigint, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  /** Soft delete (espelha o SoftDeletes: seta deleted_at). */
  softDelete(id: bigint) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

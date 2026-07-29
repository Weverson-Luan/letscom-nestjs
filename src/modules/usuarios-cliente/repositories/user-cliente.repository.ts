import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** Mapeia sort_by (snake) para campos do Prisma; default createdAt. */
const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome: 'nome',
  email: 'email',
  id: 'id',
};

@Injectable()
export class UserClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.userCliente.findMany({ orderBy: { id: 'desc' } });
  }

  findById(id: bigint) {
    return this.prisma.userCliente.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.userCliente.findUnique({ where: { email } });
  }

  findByDocumento(documento: string) {
    return this.prisma.userCliente.findFirst({ where: { documento } });
  }

  async paginateByCliente(params: {
    clienteId: bigint;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.UserClienteWhereInput = { clienteId: params.clienteId };
    if (params.search) {
      where.OR = [
        { email: { contains: params.search } },
        { nome: { contains: params.search } },
        { documento: { contains: params.search } },
      ];
    }
    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCliente.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.userCliente.count({ where }),
    ]);
    return { data, total };
  }

  update(id: bigint, data: Prisma.UserClienteUpdateInput) {
    return this.prisma.userCliente.update({ where: { id }, data });
  }

  delete(id: bigint) {
    return this.prisma.userCliente.delete({ where: { id } });
  }

  countRemessasSubordinado(id: bigint) {
    return this.prisma.remessa.count({
      where: { usersSolicitanteSubordinadoId: id },
    });
  }
}

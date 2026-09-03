import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';

@Injectable()
export class EntregaClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(params: { skip: number; take: number }) {
    const [data, total] = await Promise.all([
      this.prisma.entregaCliente.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { id: 'desc' },
        include: { remessa: true },
      }),
      this.prisma.entregaCliente.count(),
    ]);
    return { data, total };
  }

  findById(id: bigint) {
    return this.prisma.entregaCliente.findUnique({
      where: { id },
      include: { remessa: true },
    });
  }

  create(data: Prisma.EntregaClienteCreateInput) {
    return this.prisma.entregaCliente.create({ data, include: { remessa: true } });
  }

  update(id: bigint, data: Prisma.EntregaClienteUpdateInput) {
    return this.prisma.entregaCliente.update({
      where: { id },
      data,
      include: { remessa: true },
    });
  }

  delete(id: bigint) {
    return this.prisma.entregaCliente.delete({ where: { id } });
  }
}

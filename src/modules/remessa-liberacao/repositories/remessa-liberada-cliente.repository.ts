import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const includeRels = {
  remessa: true,
  executor: true,
  tipoEntrega: true,
} satisfies Prisma.RemessaLiberadaClienteInclude;

@Injectable()
export class RemessaLiberadaClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.remessaLiberadaCliente.findMany({
        include: includeRels,
        skip,
        take: perPage,
        orderBy: { id: 'desc' },
      }),
      this.prisma.remessaLiberadaCliente.count(),
    ]);
    return { items, total };
  }

  async find(id: bigint) {
    const item = await this.prisma.remessaLiberadaCliente.findUnique({
      where: { id },
      include: includeRels,
    });
    if (!item) {
      throw new NotFoundException('Liberação de remessa para cliente não encontrada.');
    }
    return item;
  }

  create(data: Prisma.RemessaLiberadaClienteCreateInput) {
    return this.prisma.remessaLiberadaCliente.create({ data, include: includeRels });
  }

  createMany(data: Prisma.RemessaLiberadaClienteCreateManyInput[]) {
    return this.prisma.remessaLiberadaCliente.createMany({ data });
  }

  async update(id: bigint, data: Prisma.RemessaLiberadaClienteUpdateInput) {
    await this.find(id);
    return this.prisma.remessaLiberadaCliente.update({
      where: { id },
      data,
      include: includeRels,
    });
  }

  async delete(id: bigint) {
    await this.find(id);
    return this.prisma.remessaLiberadaCliente.delete({ where: { id } });
  }

  findRemessaIdsLiberadas(remessaIds: bigint[]) {
    return this.prisma.remessaLiberadaCliente.findMany({
      where: { remessaId: { in: remessaIds } },
      select: { remessaId: true },
    });
  }
}

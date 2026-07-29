import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const includeRels = {
  remessa: true,
  executor: true,
  tipoEntrega: true,
} satisfies Prisma.RemessaLiberadaBalcaoInclude;

@Injectable()
export class RemessaLiberadaBalcaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RemessaLiberadaBalcaoCreateInput) {
    return this.prisma.remessaLiberadaBalcao.create({ data, include: includeRels });
  }

  createMany(data: Prisma.RemessaLiberadaBalcaoCreateManyInput[]) {
    return this.prisma.remessaLiberadaBalcao.createMany({ data });
  }

  findByRemessa(remessaId: bigint) {
    return this.prisma.remessaLiberadaBalcao.findFirst({
      where: { remessaId },
      include: includeRels,
    });
  }

  findAll() {
    return this.prisma.remessaLiberadaBalcao.findMany({ include: includeRels });
  }

  findRemessaIdsLiberadas(remessaIds: bigint[]) {
    return this.prisma.remessaLiberadaBalcao.findMany({
      where: { remessaId: { in: remessaIds } },
      select: { remessaId: true },
    });
  }
}

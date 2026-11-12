import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

export const LIMITE_LISTAGEM_LIBERACOES_BALCAO = 500;

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

  /** Teto defensivo: a listagem não é paginada e a tabela só cresce. */
  findAll() {
    return this.prisma.remessaLiberadaBalcao.findMany({
      include: includeRels,
      orderBy: { id: 'desc' },
      take: LIMITE_LISTAGEM_LIBERACOES_BALCAO,
    });
  }

  findRemessaIdsLiberadas(remessaIds: bigint[]) {
    return this.prisma.remessaLiberadaBalcao.findMany({
      where: { remessaId: { in: remessaIds } },
      select: { remessaId: true },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome: 'nome',
  valor: 'valor',
  valor_creditos: 'valorCreditos',
  estoque_minimo: 'estoqueMinimo',
  estoque_maximo: 'estoqueMaximo',
  estoque_atual: 'estoqueAtual',
  ativo: 'ativo',
  id: 'id',
};

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async paginate(params: {
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (params.search) {
      where.nome = { contains: params.search };
    }

    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  update(id: bigint, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  softDelete(id: bigint) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

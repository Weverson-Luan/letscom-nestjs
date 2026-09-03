import { Injectable } from '@nestjs/common';
import { Prisma, TipoEndereco } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  cidade: 'cidade',
  bairro: 'bairro',
  tipo_endereco: 'tipoEndereco',
  id: 'id',
};

@Injectable()
export class EnderecoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.endereco.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  findByUser(userId: bigint) {
    return this.prisma.endereco.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async paginate(params: {
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
    tipoEndereco?: TipoEndereco;
  }) {
    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };
    const where = params.tipoEndereco
      ? { tipoEndereco: params.tipoEndereco }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.endereco.findMany({
        where,
        include: { user: true },
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.endereco.count({ where }),
    ]);

    return { data, total };
  }

  create(data: Prisma.EnderecoCreateInput) {
    return this.prisma.endereco.create({
      data,
      include: { user: true },
    });
  }

  update(id: bigint, data: Prisma.EnderecoUpdateInput) {
    return this.prisma.endereco.update({
      where: { id },
      data,
      include: { user: true },
    });
  }

  delete(id: bigint) {
    return this.prisma.endereco.delete({ where: { id } });
  }

  findFirstByUserAndTipo(userId: bigint, tipo: TipoEndereco) {
    return this.prisma.endereco.findFirst({
      where: { userId, tipoEndereco: tipo },
      orderBy: { id: 'asc' },
    });
  }
}

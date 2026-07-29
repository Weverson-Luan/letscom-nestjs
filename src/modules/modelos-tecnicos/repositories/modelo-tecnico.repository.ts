import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

const SORT_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome_modelo: 'nomeModelo',
  id: 'id',
};

const INCLUDE = {
  cliente: true,
  produto: true,
  tecnologia: true,
  camposVariaveis: { orderBy: { ordem: 'asc' as const } },
} as const;

@Injectable()
export class ModeloTecnicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint) {
    return this.prisma.modeloTecnico.findUnique({
      where: { id },
      include: INCLUDE,
    });
  }

  async paginate(params: {
    clienteId?: bigint;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.ModeloTecnicoWhereInput = {};
    if (params.clienteId) where.clienteId = params.clienteId;
    if (params.search) {
      where.nomeModelo = { contains: params.search };
    }

    const sortField = SORT_MAP[params.sortBy ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [sortField]: params.order ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.modeloTecnico.findMany({
        where,
        include: INCLUDE,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.modeloTecnico.count({ where }),
    ]);

    return { data, total };
  }

  create(data: Prisma.ModeloTecnicoCreateInput) {
    return this.prisma.modeloTecnico.create({
      data,
      include: INCLUDE,
    });
  }

  update(id: bigint, data: Prisma.ModeloTecnicoUpdateInput) {
    return this.prisma.modeloTecnico.update({
      where: { id },
      data,
      include: INCLUDE,
    });
  }

  delete(id: bigint) {
    return this.prisma.modeloTecnico.delete({ where: { id } });
  }
}

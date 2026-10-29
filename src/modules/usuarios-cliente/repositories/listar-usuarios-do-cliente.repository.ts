/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** Mapeia sort_by (snake) para campos do Prisma; default createdAt. */
const CAMPOS_ORDENACAO: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  nome: 'nome',
  email: 'email',
  id: 'id',
};

@Injectable()
export class ListarUsuariosDoClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginarPorCliente(filtros: {
    clienteId: bigint;
    busca?: string;
    campoOrdenacao?: string;
    direcao?: 'asc' | 'desc';
    skip: number;
    take: number;
  }) {
    const where: Prisma.UserClienteWhereInput = { clienteId: filtros.clienteId };
    if (filtros.busca) {
      where.OR = [
        { email: { contains: filtros.busca } },
        { nome: { contains: filtros.busca } },
        { documento: { contains: filtros.busca } },
      ];
    }
    const campoPrisma = CAMPOS_ORDENACAO[filtros.campoOrdenacao ?? 'created_at'] ?? 'createdAt';
    const orderBy = { [campoPrisma]: filtros.direcao ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCliente.findMany({
        where,
        orderBy,
        skip: filtros.skip,
        take: filtros.take,
      }),
      this.prisma.userCliente.count({ where }),
    ]);
    return { data, total };
  }
}

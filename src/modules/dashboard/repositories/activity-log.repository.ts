import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';

@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 20, 100);

    const where: Prisma.ActivityLogWhereInput = {};
    if (query.user_id) where.userId = BigInt(String(query.user_id));
    if (query.evento) where.evento = String(query.evento);
    if (query.rota) where.rota = { contains: String(query.rota) };
    if (query.data_inicio || query.data_fim) {
      where.createdAt = {};
      if (query.data_inicio) {
        where.createdAt.gte = new Date(`${query.data_inicio}T00:00:00.000Z`);
      }
      if (query.data_fim) {
        where.createdAt.lte = new Date(`${query.data_fim}T23:59:59.999Z`);
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, total, pagination: buildPagination(total, page, perPage) };
  }
}

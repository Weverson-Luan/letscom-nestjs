import { Injectable } from '@nestjs/common';
import { Prisma, TipoEntrega } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class TipoEntregaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tipoEntrega.findMany({
      include: { usuarios: true },
      orderBy: { id: 'asc' },
    });
  }

  findById(id: bigint): Promise<TipoEntrega | null> {
    return this.prisma.tipoEntrega.findUnique({ where: { id } });
  }

  create(data: Prisma.TipoEntregaCreateInput) {
    return this.prisma.tipoEntrega.create({ data });
  }

  update(id: bigint, data: Prisma.TipoEntregaUpdateInput) {
    return this.prisma.tipoEntrega.update({ where: { id }, data });
  }

  delete(id: bigint) {
    return this.prisma.tipoEntrega.delete({ where: { id } });
  }
}

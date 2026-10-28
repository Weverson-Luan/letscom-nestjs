/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ExcluirUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Soft delete (espelha o SoftDeletes: seta deleted_at). */
  marcarComoExcluido(id: bigint, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

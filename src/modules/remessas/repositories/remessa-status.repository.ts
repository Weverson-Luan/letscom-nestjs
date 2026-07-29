import { Injectable } from '@nestjs/common';
import { Prisma, RemessaStatusEtapa } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class RemessaStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  exists(remessaId: bigint, status: RemessaStatusEtapa, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).remessaStatus
      .count({ where: { remessaId, status } })
      .then((c) => c > 0);
  }

  create(
    data: { remessaId: bigint; status: RemessaStatusEtapa; dataStatus: Date },
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).remessaStatus.create({ data });
  }

  findByRemessaId(remessaId: bigint) {
    return this.prisma.remessaStatus.findMany({
      where: { remessaId },
      orderBy: { dataStatus: 'asc' },
    });
  }
}

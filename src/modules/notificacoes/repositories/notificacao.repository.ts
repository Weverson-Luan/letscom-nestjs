import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class NotificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criarVarias(data: Prisma.NotificacaoCreateManyInput[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).notificacao.createMany({ data });
  }

  async paginar(params: {
    filtro: Prisma.NotificacaoWhereInput;
    apenasNaoLidas: boolean;
    skip: number;
    take: number;
  }) {
    const where: Prisma.NotificacaoWhereInput = {
      ...params.filtro,
      ...(params.apenasNaoLidas ? { lidaEm: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notificacao.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.notificacao.count({ where }),
    ]);
    return { data, total };
  }

  contarNaoLidas(filtro: Prisma.NotificacaoWhereInput) {
    return this.prisma.notificacao.count({ where: { ...filtro, lidaEm: null } });
  }

  buscarDoDestinatario(id: bigint, filtro: Prisma.NotificacaoWhereInput) {
    return this.prisma.notificacao.findFirst({ where: { id, ...filtro } });
  }

  marcarLida(id: bigint, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).notificacao.update({
      where: { id },
      data: { lidaEm: new Date() },
    });
  }

  marcarTodasLidas(filtro: Prisma.NotificacaoWhereInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).notificacao.updateMany({
      where: { ...filtro, lidaEm: null },
      data: { lidaEm: new Date() },
    });
  }
}

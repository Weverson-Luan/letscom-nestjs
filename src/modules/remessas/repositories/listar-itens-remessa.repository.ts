/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ListarItensRemessaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Remessa com a data do pedido, o campo chave do modelo, as fotos e a planilha mais recente. */
  buscarRemessaComFotosEPlanilha(id: bigint) {
    return this.prisma.remessa.findUnique({
      where: { id },
      select: {
        id: true,
        clienteId: true,
        createdAt: true,
        modeloTecnico: { select: { campoChave: true } },
        fotos: {
          select: { id: true, matricula: true, nome: true, filePath: true },
          orderBy: { id: 'asc' },
        },
        planilhas: {
          select: { filePath: true, tipo: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });
  }
}

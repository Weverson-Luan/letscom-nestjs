/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class BuscarUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorIdComTipoEntrega(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        modelosTecnicos: true,
        tiposEntregaUser: { include: { tipoEntrega: true } },
      },
    });
  }
}

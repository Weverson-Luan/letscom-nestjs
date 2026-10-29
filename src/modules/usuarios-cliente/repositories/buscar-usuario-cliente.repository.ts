/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class BuscarUsuarioClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.userCliente.findUnique({ where: { id } });
  }
}

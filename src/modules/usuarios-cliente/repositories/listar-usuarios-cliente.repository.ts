/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ListarUsuariosClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarTodos() {
    return this.prisma.userCliente.findMany({ orderBy: { id: 'desc' } });
  }
}

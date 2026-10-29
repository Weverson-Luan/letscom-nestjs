/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// seleção do usuário dono (sem senha)
import { INCLUIR_USUARIO_DONO } from '../usuarios-atendimentos.constants';

@Injectable()
export class ListarUsuariosAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarComUsuario() {
    return this.prisma.userAtendimento.findMany({
      include: INCLUIR_USUARIO_DONO,
      orderBy: { id: 'asc' },
    });
  }
}

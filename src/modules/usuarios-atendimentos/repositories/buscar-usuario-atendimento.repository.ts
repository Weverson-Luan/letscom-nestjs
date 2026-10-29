/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// seleção do usuário dono (sem senha)
import { INCLUIR_USUARIO_DONO } from '../usuarios-atendimentos.constants';

@Injectable()
export class BuscarUsuarioAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorIdComUsuario(id: bigint) {
    return this.prisma.userAtendimento.findUnique({ where: { id }, include: INCLUIR_USUARIO_DONO });
  }
}

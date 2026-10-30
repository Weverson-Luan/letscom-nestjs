/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// constants
import { PapelInterno } from '../usuarios-internos.constants';

@Injectable()
export class CriarUsuarioInternoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarIdPapel(papel: PapelInterno, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).role.findUnique({
      where: { nome: papel },
      select: { id: true },
    });
  }

  criar(dadosCriacao: Prisma.UserCreateInput, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).user.create({ data: dadosCriacao });
  }
}

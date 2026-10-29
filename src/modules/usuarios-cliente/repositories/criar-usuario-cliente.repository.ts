/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class CriarUsuarioClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorEmail(email: string, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userCliente.findUnique({ where: { email } });
  }

  buscarPorDocumento(documento: string, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userCliente.findFirst({ where: { documento } });
  }

  /** Papel atribuído quando o payload não informa `role_id`. */
  buscarPapelSubordinado(transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).role.findFirst({
      where: { nome: { in: ['subordinado', 'Subordinado'] } },
    });
  }

  criar(dadosCriacao: Prisma.UserClienteCreateInput, transacao?: Prisma.TransactionClient) {
    return (transacao ?? this.prisma).userCliente.create({ data: dadosCriacao });
  }
}

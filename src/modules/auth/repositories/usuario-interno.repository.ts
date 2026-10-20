import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** Leitura de usuários internos (tabela users) usada pelos fluxos de autenticação. */
@Injectable()
export class UsuarioInternoRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorId(id: bigint) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Primeiro consultor vinculado ao cliente (mesma regra do login). */
  async buscarConsultorDoCliente(clienteId: bigint) {
    const vinculo = await this.prisma.clienteConsultor.findFirst({
      where: { clienteId },
      include: { consultor: true },
      orderBy: { id: 'asc' },
    });

    return vinculo?.consultor ?? null;
  }
}

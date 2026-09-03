import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class UserAtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.userAtendimento.findMany({
      include: { user: true },
      orderBy: { id: 'asc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.userAtendimento.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  create(data: Prisma.UserAtendimentoCreateInput) {
    return this.prisma.userAtendimento.create({
      data,
      include: { user: true },
    });
  }

  update(id: bigint, data: Prisma.UserAtendimentoUpdateInput) {
    return this.prisma.userAtendimento.update({
      where: { id },
      data,
      include: { user: true },
    });
  }

  delete(id: bigint) {
    return this.prisma.userAtendimento.delete({ where: { id } });
  }
}

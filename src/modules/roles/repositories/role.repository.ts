import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({ orderBy: { id: 'asc' } });
  }

  findByNome(nome: string) {
    return this.prisma.role.findUnique({ where: { nome } });
  }

  create(data: Prisma.RoleCreateInput) {
    return this.prisma.role.create({ data });
  }
}

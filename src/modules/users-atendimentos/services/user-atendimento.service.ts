import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import {
  CreateUserAtendimentoDto,
  UpdateUserAtendimentoDto,
} from '../dto/user-atendimento.dto';
import { UserAtendimentoRepository } from '../repositories/user-atendimento.repository';

@Injectable()
export class UserAtendimentoService {
  constructor(
    private readonly repository: UserAtendimentoRepository,
    private readonly prisma: PrismaService,
  ) {}

  listar() {
    return this.repository.findAll();
  }

  async buscar(id: bigint) {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException('Atendimento não encontrado.');
    return item;
  }

  async criar(dto: CreateUserAtendimentoDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(dto.user_id), deletedAt: null },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return this.repository.create({
      user: { connect: { id: user.id } },
      nome: dto.nome ?? null,
      email: dto.email,
      telefone: dto.telefone,
      documento: dto.documento ?? null,
      ativo: dto.ativo ?? true,
    });
  }

  async atualizar(id: bigint, dto: UpdateUserAtendimentoDto) {
    await this.buscar(id);
    return this.repository.update(id, {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.telefone !== undefined ? { telefone: dto.telefone } : {}),
      ...(dto.documento !== undefined ? { documento: dto.documento } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    });
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }
}

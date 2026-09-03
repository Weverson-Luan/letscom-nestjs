import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoEndereco } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { mapEndereco } from '../../enderecos/mappers/endereco.mapper';
import { EnderecoRepository } from '../../enderecos/repositories/endereco.repository';
import {
  CreateEnderecoEntregaDto,
  UpdateEnderecoEntregaDto,
} from '../dto/endereco-entrega.dto';

/** Endereços de entrega = registros em `enderecos` com tipo `entrega`. */
@Injectable()
export class EnderecoEntregaService {
  constructor(
    private readonly repository: EnderecoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginate({
      tipoEndereco: TipoEndereco.entrega,
      sortBy: (query.sort_by as string) ?? 'created_at',
      order: String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
      skip,
      take,
    });
    return {
      data: data.map(mapEndereco),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async buscar(id: bigint) {
    const endereco = await this.repository.findById(id);
    if (!endereco || endereco.tipoEndereco !== TipoEndereco.entrega) {
      throw new NotFoundException('Endereço de entrega não encontrado.');
    }
    return endereco;
  }

  async criar(dto: CreateEnderecoEntregaDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(dto.user_id), deletedAt: null },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return this.repository.create({
      user: { connect: { id: user.id } },
      logradouro: dto.logradouro,
      numero: dto.numero,
      complemento: dto.complemento ?? null,
      bairro: dto.bairro,
      cidade: dto.cidade,
      estado: dto.estado,
      cep: dto.cep,
      tipoEndereco: TipoEndereco.entrega,
      nomeResponsavel: dto.nome_responsavel,
      email: dto.email,
      setor: dto.setor,
      telefone: dto.telefone,
      ativo: dto.ativo ?? true,
    });
  }

  async atualizar(id: bigint, dto: UpdateEnderecoEntregaDto) {
    await this.buscar(id);
    return this.repository.update(id, {
      ...(dto.logradouro !== undefined ? { logradouro: dto.logradouro } : {}),
      ...(dto.numero !== undefined ? { numero: dto.numero } : {}),
      ...(dto.complemento !== undefined ? { complemento: dto.complemento } : {}),
      ...(dto.bairro !== undefined ? { bairro: dto.bairro } : {}),
      ...(dto.cidade !== undefined ? { cidade: dto.cidade } : {}),
      ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
      ...(dto.cep !== undefined ? { cep: dto.cep } : {}),
      ...(dto.nome_responsavel !== undefined
        ? { nomeResponsavel: dto.nome_responsavel }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.setor !== undefined ? { setor: dto.setor } : {}),
      ...(dto.telefone !== undefined ? { telefone: dto.telefone } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    });
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }
}

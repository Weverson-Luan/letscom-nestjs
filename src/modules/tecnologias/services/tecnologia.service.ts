import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateTecnologiaDto } from '../dto/create-tecnologia.dto';
import { UpdateTecnologiaDto } from '../dto/update-tecnologia.dto';
import { mapTecnologia } from '../mappers/tecnologia.mapper';
import { TecnologiaRepository } from '../repositories/tecnologia.repository';

/** Espelha o TecnologiasService (CRUD de tecnologias). */
@Injectable()
export class TecnologiaService {
  constructor(private readonly repository: TecnologiaRepository) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const order =
      String(query.order ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { data, total } = await this.repository.paginate({
      search: query.search as string | undefined,
      sortBy: (query.sort_by as string) ?? 'created_at',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapTecnologia),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async buscar(id: bigint) {
    const tecnologia = await this.repository.findById(id);
    if (!tecnologia) {
      throw new NotFoundException('Tecnologia não encontrada.');
    }
    return tecnologia;
  }

  async criar(dto: CreateTecnologiaDto) {
    await this.validarNomeUnico(dto.nome);

    const data: Prisma.TecnologiaCreateInput = {
      nome: dto.nome,
      descricao: dto.descricao ?? null,
      ativo: dto.ativo,
    };
    return this.repository.create(data);
  }

  async atualizar(id: bigint, dto: UpdateTecnologiaDto) {
    await this.buscar(id);
    await this.validarNomeUnico(dto.nome, id);

    const data: Prisma.TecnologiaUpdateInput = {
      nome: dto.nome,
      descricao: dto.descricao ?? null,
      ativo: dto.ativo,
    };
    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }

  private async validarNomeUnico(nome: string, ignoreId?: bigint) {
    const existente = await this.repository.findByNome(nome);
    if (existente && existente.id !== ignoreId) {
      throw new BusinessException(
        'Já existe uma tecnologia com este nome.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}

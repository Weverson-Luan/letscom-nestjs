import {
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { buildPagination } from 'src/shared/utils/api-response';
import {
  CampoVariavelItemDto,
  CreateCamposVariaveisDto,
  UpdateCampoVariavelDto,
} from '../dto/campos-variaveis.dto';
import { mapCampoVariavel } from '../mappers/modelo-tecnico.mapper';
import { CamposVariaveisRepository } from '../repositories/campos-variaveis.repository';

/** Espelha ModelosTecnicosCamposVariaveisService. */
@Injectable()
export class CamposVariaveisService {
  constructor(
    private readonly repository: CamposVariaveisRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const order =
      String(query.order ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    const { data, total } = await this.repository.paginate({
      search: query.search as string | undefined,
      sortBy: (query.sort_by as string) ?? 'ordem',
      order,
      skip,
      take,
    });

    return {
      data: data.map(mapCampoVariavel),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async criarBatch(dto: CreateCamposVariaveisDto) {
    const criados: ReturnType<typeof mapCampoVariavel>[] = [];
    for (const item of dto.campos) {
      if (item.id) {
        const existe = await this.repository.findById(BigInt(item.id));
        if (existe) continue;
      }
      if (!item.modelo_tecnico_id) {
        throw new BusinessException(
          'modelo_tecnico_id é obrigatório em cada campo.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      const modelo = await this.prisma.modeloTecnico.findUnique({
        where: { id: BigInt(item.modelo_tecnico_id) },
      });
      if (!modelo) {
        throw new BusinessException(
          'O modelo técnico informado não existe.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const created = await this.repository.create({
        modeloTecnico: { connect: { id: BigInt(item.modelo_tecnico_id) } },
        nome: item.nome,
        obrigatorio: item.obrigatorio ?? false,
        ordem: item.ordem ?? 0,
      });
      criados.push(mapCampoVariavel(created));
    }
    return criados;
  }

  async sincronizar(modeloTecnicoId: bigint, campos: CampoVariavelItemDto[]) {
    const modelo = await this.prisma.modeloTecnico.findUnique({
      where: { id: modeloTecnicoId },
    });
    if (!modelo) {
      throw new BusinessException(
        'Modelo técnico não encontrado.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (campos.length === 0) {
        await tx.modeloTecnicoCampoVariavel.deleteMany({
          where: { modeloTecnicoId },
        });
        return [];
      }

      const idsKept: bigint[] = [];

      for (const item of campos) {
        if (item.id) {
          const campo = await tx.modeloTecnicoCampoVariavel.findFirst({
            where: { id: BigInt(item.id), modeloTecnicoId },
          });
          if (!campo) {
            throw new BusinessException(
              'Campo variável não pertence a este modelo técnico.',
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          await tx.modeloTecnicoCampoVariavel.update({
            where: { id: campo.id },
            data: { nome: item.nome, obrigatorio: item.obrigatorio },
          });
          idsKept.push(campo.id);
        } else {
          const agg = await tx.modeloTecnicoCampoVariavel.aggregate({
            where: { modeloTecnicoId },
            _max: { ordem: true },
          });
          const novo = await tx.modeloTecnicoCampoVariavel.create({
            data: {
              modeloTecnicoId,
              nome: item.nome,
              obrigatorio: item.obrigatorio,
              ordem: (agg._max.ordem ?? 0) + 1,
            },
          });
          idsKept.push(novo.id);
        }
      }

      await tx.modeloTecnicoCampoVariavel.deleteMany({
        where: {
          modeloTecnicoId,
          id: { notIn: idsKept },
        },
      });

      const result = await tx.modeloTecnicoCampoVariavel.findMany({
        where: { modeloTecnicoId },
        orderBy: { ordem: 'asc' },
      });
      return result.map(mapCampoVariavel);
    });
  }

  async atualizar(id: bigint, dto: UpdateCampoVariavelDto) {
    const campo = await this.repository.findById(id);
    if (!campo) throw new NotFoundException('Campo variável não encontrado.');

    const updated = await this.repository.update(id, {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.obrigatorio !== undefined ? { obrigatorio: dto.obrigatorio } : {}),
      ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
    });
    return mapCampoVariavel(updated);
  }

  async excluir(id: bigint) {
    const campo = await this.repository.findById(id);
    if (!campo) return false;

    const modeloId = campo.modeloTecnicoId;
    await this.repository.delete(id);
    await this.reorganizarOrdem(modeloId);
    return true;
  }

  private async reorganizarOrdem(modeloTecnicoId: bigint) {
    const campos = await this.repository.listByModelo(modeloTecnicoId);
    for (let i = 0; i < campos.length; i++) {
      if (campos[i].ordem !== i) {
        await this.repository.update(campos[i].id, { ordem: i });
      }
    }
  }
}

import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TIPOS_USUARIO_FEATURE_FLAG } from 'src/shared/constants/roles';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { FeatureFlagRepository } from '../repositories/feature-flag.repository';
import { CreateFeatureFlagDto } from '../dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from '../dto/update-feature-flag.dto';

/** Espelha o FeatureFlagService (CRUD administrativo das feature flags). */
@Injectable()
export class FeatureFlagService {
  constructor(private readonly repository: FeatureFlagRepository) {}

  listar() {
    return this.repository.findAll();
  }

  async buscar(id: bigint) {
    const flag = await this.repository.findById(id);
    if (!flag) throw new NotFoundException('Feature flag não encontrada.');
    return flag;
  }

  async criar(dto: CreateFeatureFlagDto) {
    await this.validarChaveUnica(dto.key);
    this.validarTipoUsuario(dto.tipo_usuario);

    const data: Prisma.FeatureFlagCreateInput = {
      key: dto.key,
      nome: dto.nome,
      descricao: dto.descricao ?? null,
      tipoUsuario: dto.tipo_usuario ?? null,
      ativo: dto.ativo ?? false,
    };
    return this.repository.create(data);
  }

  async atualizar(id: bigint, dto: UpdateFeatureFlagDto) {
    await this.buscar(id);
    if (dto.key) await this.validarChaveUnica(dto.key, id);
    this.validarTipoUsuario(dto.tipo_usuario);

    const data: Prisma.FeatureFlagUpdateInput = {};
    if (dto.key !== undefined) data.key = dto.key;
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.tipo_usuario !== undefined) data.tipoUsuario = dto.tipo_usuario;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;

    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    const vinculados = await this.repository.countUsuariosVinculados(id);
    if (vinculados > 0) {
      throw new BusinessException(
        'Não é possível excluir uma feature flag com usuários vinculados.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.repository.delete(id);
  }

  private async validarChaveUnica(key: string, ignoreId?: bigint) {
    const existente = await this.repository.findByKey(key);
    if (existente && existente.id !== ignoreId) {
      throw new BusinessException(
        'Esta chave de feature flag já está em uso.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private validarTipoUsuario(tipoUsuario?: string) {
    if (!tipoUsuario) return;
    const tipos = tipoUsuario
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const invalidos = tipos.filter(
      (t) => !(TIPOS_USUARIO_FEATURE_FLAG as readonly string[]).includes(t),
    );
    if (invalidos.length > 0) {
      throw new BusinessException(
        'Um ou mais tipos de usuário informados são inválidos.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}

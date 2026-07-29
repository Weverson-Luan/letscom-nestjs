import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { HttpStatus } from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';

/**
 * Espelha o RoleService do Laravel. Correção documentada: usa as colunas reais
 * `nome`/`descricao` (o Laravel validava/atribuía `name`/`description`, que não
 * existem na tabela `roles`).
 */
@Injectable()
export class RoleService {
  constructor(private readonly repository: RoleRepository) {}

  listar() {
    return this.repository.findAll();
  }

  async criar(data: { nome: string; descricao?: string | null }) {
    const existente = await this.repository.findByNome(data.nome);
    if (existente) {
      throw new BusinessException(
        'Já existe uma role com este nome.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return this.repository.create({
      nome: data.nome,
      descricao: data.descricao ?? null,
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTipoEntregaDto, UpdateTipoEntregaDto } from '../dto/tipo-entrega.dto';
import { TipoEntregaRepository } from '../repositories/tipo-entrega.repository';

@Injectable()
export class TipoEntregaService {
  constructor(private readonly repository: TipoEntregaRepository) {}

  listar() {
    return this.repository.findAll();
  }

  async buscar(id: bigint) {
    const tipo = await this.repository.findById(id);
    if (!tipo) throw new NotFoundException('Tipo de entrega não encontrado.');
    return tipo;
  }

  criar(dto: CreateTipoEntregaDto) {
    return this.repository.create({
      tipo: dto.tipo,
      ativo: dto.ativo ?? true,
    });
  }

  async atualizar(id: bigint, dto: UpdateTipoEntregaDto) {
    await this.buscar(id);
    return this.repository.update(id, {
      ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    });
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { mapProduct } from '../mappers/product.mapper';
import { ProdutoUsuarioRepository } from '../repositories/produto-usuario.repository';

/** Espelha o ProdutoUsuarioService (vínculo cliente ↔ produto). */
@Injectable()
export class ProdutoUsuarioService {
  constructor(private readonly repository: ProdutoUsuarioRepository) {}

  async vincular(userId: bigint, produtoId: bigint) {
    await this.garantirUsuarioEProduto(userId, produtoId);
    await this.repository.vincular(userId, produtoId);
  }

  async desvincular(userId: bigint, produtoId: bigint) {
    await this.garantirUsuarioEProduto(userId, produtoId);
    await this.repository.desvincular(userId, produtoId);
  }

  async listar(userId: bigint) {
    const user = await this.repository.findUser(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const vinculos = await this.repository.listarPorCliente(userId);
    return vinculos
      .filter((v) => v.produto && v.produto.deletedAt == null)
      .map((v) => mapProduct(v.produto));
  }

  private async garantirUsuarioEProduto(userId: bigint, produtoId: bigint) {
    const user = await this.repository.findUser(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    const produto = await this.repository.findProduct(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }
  }
}

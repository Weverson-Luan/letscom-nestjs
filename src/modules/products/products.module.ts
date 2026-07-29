import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProdutoUsuarioController } from './controllers/produto-usuario.controller';
import { ProductRepository } from './repositories/product.repository';
import { ProdutoUsuarioRepository } from './repositories/produto-usuario.repository';
import { ProductService } from './services/product.service';
import { ProdutoUsuarioService } from './services/produto-usuario.service';

@Module({
  controllers: [ProductController, ProdutoUsuarioController],
  providers: [
    ProductService,
    ProductRepository,
    ProdutoUsuarioService,
    ProdutoUsuarioRepository,
  ],
  exports: [ProductService, ProdutoUsuarioService],
})
export class ProductsModule {}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { VincularProdutoDto } from '../dto/vincular-produto.dto';
import { ProdutoUsuarioService } from '../services/produto-usuario.service';

/**
 * Vínculo cliente ↔ produto — espelha ProdutoUsuarioController.
 * Rotas: /produto-usuario/*
 */
@ApiTags('produto-usuario')
@ApiBearerAuth()
@Roles(...ALL_ROLES)
@Controller('produto-usuario')
export class ProdutoUsuarioController {
  constructor(private readonly service: ProdutoUsuarioService) {}

  @Post('vincular')
  @ApiOperation({ summary: 'Vincula um produto a um usuário (cliente)' })
  async vincular(@Body() body: VincularProdutoDto) {
    await this.service.vincular(BigInt(body.user_id), BigInt(body.produto_id));
    return ApiResponse.success('Produto vinculado com sucesso.', []);
  }

  @Post('desvincular')
  @ApiOperation({ summary: 'Desvincula um produto de um usuário (cliente)' })
  async desvincular(@Body() body: VincularProdutoDto) {
    await this.service.desvincular(
      BigInt(body.user_id),
      BigInt(body.produto_id),
    );
    return ApiResponse.success('Produto desvinculado com sucesso.', []);
  }

  @Get(':userId/listar')
  @ApiOperation({ summary: 'Lista produtos vinculados a um usuário' })
  async listar(@Param('userId') userId: string) {
    const produtos = await this.service.listar(BigInt(userId));
    return ApiResponse.success(
      'Produtos vinculados carregados com sucesso!',
      produtos,
    );
  }
}

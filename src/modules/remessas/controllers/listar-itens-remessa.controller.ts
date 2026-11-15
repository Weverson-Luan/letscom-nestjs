/**
 * IMPORTS
 */
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';

// mappers
import { mapItensRemessa } from '../mappers/itens-remessa.mapper';

// services
import { ListarItensRemessaService } from '../services/listar-itens-remessa.service';

@ApiTags('remessas')
@ApiBearerAuth()
@Controller('remessas')
export class ListarItensRemessaController {
  constructor(private readonly service: ListarItensRemessaService) {}

  @Get(':id/itens')
  @RequireFeatures(Feature.VISUALIZAR_REMESSAS_ANDAMENTO, Feature.VISUALIZAR_HISTORICO_REMESSAS)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiParam({ name: 'id', description: 'ID da remessa' })
  @ApiOperation({ summary: 'Itens da remessa: fotos com os dados da planilha' })
  async listarItensRemessa(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUser,
  ) {
    const itens = await this.service.execute(BigInt(id), usuario);
    return ApiResponse.success('Itens da remessa carregados com sucesso!', mapItensRemessa(itens));
  }
}

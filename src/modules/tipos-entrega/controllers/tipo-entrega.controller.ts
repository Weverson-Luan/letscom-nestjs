import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import {
  CreateTipoEntregaDto,
  UpdateTipoEntregaDto,
  VincularTipoEntregaDto,
} from '../dto/tipo-entrega.dto';
import {
  mapTipoEntrega,
  mapTipoEntregaUser,
} from '../mappers/tipo-entrega.mapper';
import { TipoEntregaUserService } from '../services/tipo-entrega-user.service';
import { TipoEntregaService } from '../services/tipo-entrega.service';

@ApiTags('tipos-entrega')
@ApiBearerAuth()
@Roles(...ALL_ROLES)
@Controller('tipos-entrega')
export class TipoEntregaController {
  constructor(
    private readonly service: TipoEntregaService,
    private readonly userService: TipoEntregaUserService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista tipos de entrega' })
  async index() {
    const tipos = await this.service.listar();
    return ApiResponse.success(
      'Tipos de entrega carregados com sucesso!',
      tipos.map(mapTipoEntrega),
    );
  }

  @Get('usuarios/:id')
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Lista tipos de entrega vinculados a um usuário' })
  async listarPorUsuario(@Param('id') id: string) {
    const data = await this.userService.listarPorUsuario(BigInt(id));
    return data.map(mapTipoEntregaUser);
  }

  @Post('vincular-tipos-entrega/users')
  @ApiOperation({ summary: 'Vincula tipo de entrega a um cliente' })
  async vincular(@Body() body: VincularTipoEntregaDto) {
    const result = await this.userService.vincular(
      BigInt(body.cliente_id),
      BigInt(body.tipo_entrega_id),
    );
    return {
      message: 'Vínculo criado com sucesso',
      data: mapTipoEntregaUser(result),
    };
  }

  @Post('atualizar/users')
  @ApiOperation({ summary: 'Atualiza tipo de entrega de um cliente' })
  async atualizarTipoEntrega(@Body() body: VincularTipoEntregaDto) {
    return this.userService.atualizarTipoEntrega(
      BigInt(body.cliente_id),
      BigInt(body.tipo_entrega_id),
    );
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um tipo de entrega' })
  async store(@Body() body: CreateTipoEntregaDto) {
    const tipo = await this.service.criar(body);
    return mapTipoEntrega(tipo);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do tipo de entrega' })
  @ApiOperation({ summary: 'Detalha um tipo de entrega' })
  async show(@Param('id') id: string) {
    const tipo = await this.service.buscar(BigInt(id));
    return mapTipoEntrega(tipo);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do tipo de entrega' })
  @ApiOperation({ summary: 'Atualiza um tipo de entrega' })
  async update(@Param('id') id: string, @Body() body: UpdateTipoEntregaDto) {
    const tipo = await this.service.atualizar(BigInt(id), body);
    return mapTipoEntrega(tipo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um tipo de entrega' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return { message: 'Tipo de entrega removido com sucesso.' };
  }
}

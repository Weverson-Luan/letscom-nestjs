import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ALL_ROLES } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import {
  CreateEntregaClienteDto,
  UpdateEntregaClienteDto,
} from '../dto/entrega-cliente.dto';
import { mapEntregaCliente } from '../mappers/entrega-cliente.mapper';
import { EntregaClienteService } from '../services/entrega-cliente.service';

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string };

@ApiTags('entregas-cliente')
@ApiBearerAuth()
@Roles(...ALL_ROLES)
@Controller('entregas-cliente')
export class EntregaClienteController {
  constructor(private readonly service: EntregaClienteService) {}

  @Get()
  @ApiOperation({ summary: 'Lista entregas registradas' })
  async index(@Query() query: PaginationQueryDto) {
    const { data, pagination } = await this.service.listar(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Entregas carregadas com sucesso!',
      data.map(mapEntregaCliente),
      pagination,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID da entrega' })
  @ApiOperation({ summary: 'Detalha uma entrega' })
  async show(@Param('id') id: string) {
    const entrega = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Entrega carregada com sucesso!',
      mapEntregaCliente(entrega),
    );
  }

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imagem_protocolo'))
  @ApiOperation({ summary: 'Registra entrega de remessa ao cliente' })
  async store(
    @Body() body: CreateEntregaClienteDto,
    @UploadedFile() imagem?: MulterFile,
  ) {
    const entrega = await this.service.registrar(body, imagem);
    return {
      status: 'success',
      message: 'Entrega registrada com sucesso',
      data: mapEntregaCliente(entrega),
    };
  }

  @Put(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imagem_protocolo'))
  @ApiParam({ name: 'id', description: 'ID da entrega' })
  @ApiOperation({ summary: 'Atualiza uma entrega' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateEntregaClienteDto,
    @UploadedFile() imagem?: MulterFile,
  ) {
    const entrega = await this.service.atualizar(BigInt(id), body, imagem);
    return ApiResponse.success(
      'Entrega atualizada com sucesso!',
      mapEntregaCliente(entrega),
    );
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID da entrega' })
  @ApiOperation({ summary: 'Remove uma entrega' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return ApiResponse.success('Entrega removida com sucesso.', []);
  }
}

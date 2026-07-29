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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateUserClienteDto } from '../dto/create-user-cliente.dto';
import { UpdateUserClienteDto } from '../dto/update-user-cliente.dto';
import { mapUserCliente } from '../mappers/user-cliente.mapper';
import { UserClienteService } from '../services/user-cliente.service';

@ApiTags('usuarios-cliente')
@ApiBearerAuth()
@Controller('usuarios-cliente')
export class UserClienteController {
  constructor(private readonly service: UserClienteService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiOperation({ summary: 'Lista todos os usuários-cliente' })
  async index() {
    const users = await this.service.listarTodos();
    return ApiResponse.success(
      'Usuários do cliente carregados com sucesso!',
      users.map(mapUserCliente),
    );
  }

  @Get('cliente/:id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiOperation({ summary: 'Lista os usuários de um cliente (paginado)' })
  async buscarPorCliente(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { data, pagination } = await this.service.listarPorCliente(
      BigInt(id),
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Usuários do cliente carregados com sucesso!',
      data,
      pagination,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Detalha um usuário-cliente' })
  async show(@Param('id') id: string) {
    const user = await this.service.buscar(BigInt(id));
    return ApiResponse.success(
      'Usuário do cliente carregado com sucesso!',
      user ? mapUserCliente(user) : null,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário-cliente' })
  async store(@Body() body: CreateUserClienteDto) {
    const user = await this.service.create(body as unknown as Record<string, any>);
    return ApiResponse.success(
      'Usuário do cliente criado com sucesso!',
      mapUserCliente(user),
      null,
      201,
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Atualiza um usuário-cliente' })
  async update(@Param('id') id: string, @Body() body: UpdateUserClienteDto) {
    const user = await this.service.update(
      BigInt(id),
      body as unknown as Record<string, any>,
    );
    return ApiResponse.success(
      'Usuário do cliente atualizado com sucesso!',
      mapUserCliente(user),
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário-cliente' })
  @ApiOperation({ summary: 'Exclui um usuário-cliente' })
  async destroy(@Param('id') id: string) {
    await this.service.delete(BigInt(id));
    return ApiResponse.success('Usuário do cliente removido com sucesso!', []);
  }
}

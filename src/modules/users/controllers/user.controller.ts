import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateFullClientDto } from '../dto/create-full-client.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateFullClientService } from '../services/create-full-client.service';
import { UserService } from '../services/user.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly createFullClientService: CreateFullClientService,
  ) {}

  @Get('dados')
  @ApiOperation({ summary: 'Dados do usuário autenticado (dashboard)' })
  async buscarDadosUsuario(@CurrentUser() user: AuthUser) {
    const data = await this.userService.buscarDadosUsuario(user);
    return { code: 200, message: 'Dados do usuário carregados com sucesso!', data };
  }

  @Get('consultores')
  @RequireFeatures(Feature.CRIAR_CLIENTE, Feature.EDITAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Lista usuários consultores' })
  async buscarUsuariosConsultores(@Query() query: PaginationQueryDto) {
    const result = await this.userService.listConsultores(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Usuários consultores carregados com sucesso!',
      result.data,
      result.pagination,
    );
  }

  @Get()
  @RequireFeatures(Feature.VISUALIZAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Lista clientes/usuários' })
  async buscarClientes(@Query() query: PaginationQueryDto) {
    const result = await this.userService.list(query as unknown as Record<string, unknown>);
    return ApiResponse.success('Usuários carregadas com sucesso!', result.data, result.pagination);
  }

  @Get(':id')
  @RequireFeatures(Feature.VISUALIZAR_CLIENTE, Feature.EDITAR_CLIENTE)
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.RECEPCAO,
    Role.EXPEDICAO,
    Role.CLIENTE,
    Role.SUBORDINADO,
  )
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Busca um usuário por id' })
  async buscarPorUmUsuario(@Param('id') id: string) {
    const user = await this.userService.buscarUsuarioComTipoEntrega(BigInt(id));
    return {
      code: 200,
      status: 'success',
      message: 'Usuários encontrado com sucesso!',
      data: user,
    };
  }

  @Post()
  @RequireFeatures(Feature.CRIAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário' })
  async criarUsuario(@Body() body: CreateUserDto) {
    const user = await this.userService.create(body as unknown as Record<string, any>);
    return {
      message: 'Usuário criado com sucesso!',
      data: serializeUser(user),
    };
  }

  @Post('cliente-completo')
  @RequireFeatures(Feature.CRIAR_CLIENTE)
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria cliente + endereço + subordinados (transacional)' })
  async criarClienteCompleto(@Body() body: CreateFullClientDto) {
    const result = await this.createFullClientService.executar(body);
    return {
      status: 201,
      message: 'Cliente, endereço e usuários criados com sucesso!',
      data: {
        user: result.user,
        endereco: result.endereco,
        usuarios_cliente: result.usuarios_cliente,
      },
    };
  }

  @Put(':id')
  @Roles(
    Role.ADMIN,
    Role.PRODUCAO,
    Role.CONSULTOR,
    Role.RECEPCAO,
    Role.EXPEDICAO,
    Role.CLIENTE,
    Role.SUBORDINADO,
  )
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Atualiza um usuário' })
  async atualizarUsuario(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    const data = body as unknown as Record<string, any>;
    await this.userService.assertPodeAtualizar(user, BigInt(id), data);
    await this.userService.update(BigInt(id), data);
    return { success: 'ok' };
  }

  @Delete(':id')
  @RequireFeatures(Feature.INATIVAR_CLIENTE)
  @Roles(Role.ADMIN, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Exclui (soft delete) um usuário' })
  async excluirUsuario(@Param('id') id: string) {
    const success = await this.userService.delete(BigInt(id));
    return { success };
  }
}

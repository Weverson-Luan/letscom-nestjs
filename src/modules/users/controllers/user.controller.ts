import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from 'src/shared/constants/roles';
import { AuthUser, CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateFullClientDto } from '../dto/create-full-client.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { CreateFullClientUseCase } from '../use-cases/create-full-client.use-case';
import { CreateUserUseCase } from '../use-cases/create-user.use-case';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly createFullClientUseCase: CreateFullClientUseCase,
  ) {}

  @Get('dados')
  @ApiOperation({ summary: 'Dados do usuário autenticado (dashboard)' })
  async buscarDadosUsuario(@CurrentUser() user: AuthUser) {
    const data = await this.userService.buscarDadosUsuario(user);
    return { code: 200, message: 'Dados do usuário carregados com sucesso!', data };
  }

  @Get('consultores')
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
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Lista clientes/usuários' })
  async buscarClientes(@Query() query: PaginationQueryDto) {
    const result = await this.userService.list(
      query as unknown as Record<string, unknown>,
    );
    return ApiResponse.success(
      'Usuários carregadas com sucesso!',
      result.data,
      result.pagination,
    );
  }

  @Get(':id')
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
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Cria um usuário' })
  async criarUsuario(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, body: responseBody } = await this.createUserUseCase.execute(
      body as unknown as Record<string, any>,
    );
    res.status(status);
    return responseBody;
  }

  @Post('cliente-completo')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiOperation({ summary: 'Cria cliente + endereço + subordinados (transacional)' })
  async criarClienteCompleto(
    @Body() body: CreateFullClientDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, body: responseBody } =
      await this.createFullClientUseCase.execute(
        body as unknown as Record<string, any>,
      );
    res.status(status);
    return responseBody;
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
  async atualizarUsuario(@Param('id') id: string, @Body() body: UpdateUserDto) {
    await this.userService.update(BigInt(id), body as unknown as Record<string, any>);
    return { success: 'ok' };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiOperation({ summary: 'Exclui (soft delete) um usuário' })
  async excluirUsuario(@Param('id') id: string) {
    const success = await this.userService.delete(BigInt(id));
    return { success };
  }
}

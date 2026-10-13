import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RoleService } from '../services/role.service';
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly service: RoleService) {}

  @Get()
  @RequireFeatures(
    Feature.CRIAR_CLIENTE,
    Feature.CRIAR_USUARIO_CLIENTE,
    Feature.ACESSAR_FEATURE_FLAGS,
  )
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE)
  @ApiOperation({ summary: 'Lista todas as roles' })
  async index() {
    const roles = await this.service.listar();
    return ApiResponse.success('Roles carregadas com sucesso!', roles);
  }

  @Post()
  @RequireFeatures(Feature.ACESSAR_FEATURE_FLAGS)
  @Roles(Role.ADMIN)
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria uma role' })
  async store(@Body() body: CreateRoleDto) {
    const role = await this.service.criar(body);
    return ApiResponse.success('Role criada com sucesso!', role, null, 201);
  }
}

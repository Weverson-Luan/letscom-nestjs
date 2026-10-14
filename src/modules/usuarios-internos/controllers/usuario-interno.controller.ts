import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Feature } from 'src/shared/auth/features';
import { Role } from 'src/shared/constants/roles';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ApiResponse } from 'src/shared/utils/api-response';
import { AtualizarUsuarioInternoDto } from '../dto/atualizar-usuario-interno.dto';
import { CriarUsuarioInternoDto } from '../dto/criar-usuario-interno.dto';
import { ListarUsuariosInternosQueryDto } from '../dto/listar-usuarios-internos-query.dto';
import { AtualizarUsuarioInternoService } from '../services/atualizar-usuario-interno.service';
import { BuscarUsuarioInternoService } from '../services/buscar-usuario-interno.service';
import { CriarUsuarioInternoService } from '../services/criar-usuario-interno.service';
import { ListarUsuariosInternosService } from '../services/listar-usuarios-internos.service';

/** Gerenciamento de usuários consultor, produção e recepção pelo backoffice (só admin). */
@ApiTags('usuarios-internos')
@ApiBearerAuth()
@Controller('usuarios-internos')
@Roles(Role.ADMIN)
@RequireFeatures(Feature.GERENCIAR_USUARIOS_INTERNOS)
export class UsuarioInternoController {
  constructor(
    private readonly listarUsuariosInternos: ListarUsuariosInternosService,
    private readonly buscarUsuarioInterno: BuscarUsuarioInternoService,
    private readonly criarUsuarioInterno: CriarUsuarioInternoService,
    private readonly atualizarUsuarioInterno: AtualizarUsuarioInternoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários internos (consultor, produção, recepção)' })
  async listar(@Query() query: ListarUsuariosInternosQueryDto) {
    const { data, pagination } = await this.listarUsuariosInternos.execute(query);
    return ApiResponse.success('Usuários internos carregados com sucesso!', data, pagination);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do usuário interno' })
  @ApiOperation({ summary: 'Detalha um usuário interno' })
  async buscar(@Param('id', ParseIntPipe) id: number) {
    const data = await this.buscarUsuarioInterno.execute(BigInt(id));
    return ApiResponse.success('Usuário interno carregado com sucesso!', data);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário interno' })
  async criar(@Body() body: CriarUsuarioInternoDto) {
    const data = await this.criarUsuarioInterno.execute(body);
    return ApiResponse.success('Usuário interno criado com sucesso!', data, null, 201);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do usuário interno' })
  @ApiOperation({ summary: 'Atualiza dados do usuário interno (e-mail não é alterável)' })
  async atualizar(@Param('id', ParseIntPipe) id: number, @Body() body: AtualizarUsuarioInternoDto) {
    const data = await this.atualizarUsuarioInterno.execute(BigInt(id), body);
    return ApiResponse.success('Usuário interno atualizado com sucesso!', data);
  }
}

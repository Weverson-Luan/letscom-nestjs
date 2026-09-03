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
import {
  CreateUserAtendimentoDto,
  UpdateUserAtendimentoDto,
} from '../dto/user-atendimento.dto';
import { mapUserAtendimento } from '../mappers/user-atendimento.mapper';
import { UserAtendimentoService } from '../services/user-atendimento.service';

@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
export class UserAtendimentoController {
  constructor(private readonly service: UserAtendimentoService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários de atendimento' })
  async index() {
    const data = await this.service.listar();
    return data.map(mapUserAtendimento);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Detalha um atendimento' })
  async show(@Param('id') id: string) {
    const item = await this.service.buscar(BigInt(id));
    return mapUserAtendimento(item);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário de atendimento' })
  async store(@Body() body: CreateUserAtendimentoDto) {
    const item = await this.service.criar(body);
    return mapUserAtendimento(item);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Atualiza um atendimento' })
  async update(@Param('id') id: string, @Body() body: UpdateUserAtendimentoDto) {
    const item = await this.service.atualizar(BigInt(id), body);
    return mapUserAtendimento(item);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID do atendimento' })
  @ApiOperation({ summary: 'Remove um atendimento' })
  async destroy(@Param('id') id: string) {
    await this.service.excluir(BigInt(id));
    return { message: 'Atendimento removido com sucesso.' };
  }
}

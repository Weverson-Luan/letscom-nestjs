import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from 'src/shared/constants/roles';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateRemessaResponsabilidadeDto } from '../dto/create-remessa-responsabilidade.dto';
import { UpdateRemessaResponsabilidadeDto } from '../dto/update-remessa-responsabilidade.dto';
import { RemessaResponsabilidadeService } from '../services/remessa-responsabilidade.service';

@ApiTags('remessa-responsabilidade')
@ApiBearerAuth()
@Controller('remessa-responsabilidade')
export class RemessaResponsabilidadeController {
  constructor(
    private readonly service: RemessaResponsabilidadeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE)
  @ApiOperation({ summary: 'Lista as ciências de responsabilidade' })
  index() {
    return this.service.listarAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE)
  @ApiParam({ name: 'id', description: 'ID da ciência' })
  @ApiOperation({ summary: 'Detalha uma ciência' })
  show(@Param('id') id: string) {
    return this.service.visualizar(BigInt(id));
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR, Role.CLIENTE, Role.SUBORDINADO)
  @ApiOperation({ summary: 'Registra uma ciência de responsabilidade' })
  async store(
    @Body() body: CreateRemessaResponsabilidadeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const errors: Record<string, string[]> = {};
    if (!body.cliente_id || !/^\d+$/.test(String(body.cliente_id))) {
      errors.cliente_id = ['O campo cliente_id é obrigatório!'];
    } else if (
      !(await this.prisma.user.findUnique({ where: { id: BigInt(body.cliente_id) } }))
    ) {
      errors.cliente_id = ['O cliente informado não foi encontrado!'];
    }
    if (!body.nome) errors.nome = ['O campo nome é obrigatório!'];
    if (!body.documento) {
      errors.documento = ['O campo documento é obrigatório!'];
    } else if (String(body.documento).length < 11 || String(body.documento).length > 20) {
      errors.documento = ['O documento deve ter entre 11 e 20 caracteres!'];
    }

    if (Object.keys(errors).length > 0) {
      res.status(422);
      return { status: 'error', message: 'Erro de validação dos dados enviados!', errors };
    }

    const responseSave = await this.service.salvar({
      cliente_id: Number(body.cliente_id),
      nome: body.nome,
      documento: body.documento,
    });
    res.status(201);
    return { code: 200, message: 'Ciência do cliente criada com sucesso!', data: responseSave };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PRODUCAO, Role.CONSULTOR)
  @ApiParam({ name: 'id', description: 'ID da ciência' })
  @ApiOperation({ summary: 'Atualiza uma ciência' })
  update(@Param('id') id: string, @Body() body: UpdateRemessaResponsabilidadeDto) {
    return this.service.atualizar(BigInt(id), {
      numero_documento: body.numero_documento,
      ativo: body.ativo,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'ID da ciência' })
  @ApiOperation({ summary: 'Remove uma ciência' })
  destroy(@Param('id') id: string) {
    return this.service.deletar(BigInt(id));
  }
}

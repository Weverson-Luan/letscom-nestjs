/**
 * IMPORTS
 */
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// shared
import { Feature } from 'src/shared/auth/features';
import { RequireFeatures } from 'src/shared/decorators/features.decorator';

// dto / services
import { CriarUsuarioAtendimentoDto } from '../dto/criar-usuario-atendimento.dto';
import { CriarUsuarioAtendimentoService } from '../services/criar-usuario-atendimento.service';

/** A rota continua 'users-atendimentos' (contrato com o front). */
@ApiTags('users-atendimentos')
@ApiBearerAuth()
@Controller('users-atendimentos')
@RequireFeatures(Feature.ACESSAR_ADMIN)
export class CriarUsuarioAtendimentoController {
  constructor(private readonly criarUsuarioAtendimentoService: CriarUsuarioAtendimentoService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário de atendimento' })
  criarUsuarioAtendimento(@Body() body: CriarUsuarioAtendimentoDto) {
    return this.criarUsuarioAtendimentoService.execute(body);
  }
}

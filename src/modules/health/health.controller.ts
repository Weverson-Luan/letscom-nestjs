import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/shared/decorators/public.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/**
 * Health-check de banco — espelha DatabaseConnectionController@checkConnection
 * (GET /testar_conexao).
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('testar_conexao')
  @ApiOperation({ summary: 'Verifica a conexão com o banco de dados' })
  async checkConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { message: '200 OK - Conectado ao banco de dados!' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao conectar ao banco de dados: ${(error as Error).message}`,
      );
    }
  }
}

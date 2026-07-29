import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { LiberarRemessaBalcaoDto } from '../dto/liberar-remessa-balcao.dto';
import { mapRemessaLiberadaBalcao } from '../mappers/remessa-liberada.mapper';
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';
import { LiberacaoRemessaBalcaoEmailService } from './liberacao-remessa-balcao-email.service';

@Injectable()
export class RemessaLiberadaBalcaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaLiberadaBalcaoRepository,
    private readonly emailService: LiberacaoRemessaBalcaoEmailService,
  ) {}

  async liberarRemessaParaBalcao(dto: LiberarRemessaBalcaoDto, user: AuthUser) {
    const remessa = await this.prisma.remessa.findFirst({
      where: { id: BigInt(dto.remessa_id), deletedAt: null },
      include: {
        solicitante: true,
        solicitanteSubordinado: true,
      },
    });

    if (!remessa) {
      throw new BusinessException('Remessa não encontrada!');
    }

    if (remessa.userIdExecutor) {
      const designerProducao = await this.prisma.user.findUnique({
        where: { id: remessa.userIdExecutor },
      });
      if (!designerProducao) {
        throw new BusinessException('Executor não encontrado!');
      }
    }

    const liberador = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!liberador) {
      throw new BusinessException('Usuário liberador não encontrado!');
    }

    const registro = await this.repository.create({
      remessa: { connect: { id: remessa.id } },
      executor: { connect: { id: liberador.id } },
      tipoEntrega: { connect: { id: BigInt(dto.tipo_entrega_id) } },
      observacao: dto.observacao ?? null,
      outros: dto.outros ?? null,
    });

    await this.emailService.enviar(
      remessa,
      {
        id: liberador.id,
        nome: liberador.nome,
        roles: user.roles.map((nome) => ({ nome })),
      },
      BigInt(dto.tipo_entrega_id),
      dto.observacao ?? '',
    );

    return mapRemessaLiberadaBalcao(registro);
  }

  async listarLiberacoes() {
    const items = await this.repository.findAll();
    return items.map(mapRemessaLiberadaBalcao);
  }

  async listarPorRemessa(remessaId: bigint) {
    const item = await this.repository.findByRemessa(remessaId);
    return item ? mapRemessaLiberadaBalcao(item) : null;
  }
}

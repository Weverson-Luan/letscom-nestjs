import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { TipoEntregaUserRepository } from '../repositories/tipo-entrega-user.repository';

@Injectable()
export class TipoEntregaUserService {
  constructor(
    private readonly repository: TipoEntregaUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  listarPorUsuario(userId: bigint) {
    return this.repository.listByUser(userId);
  }

  async vincular(clienteId: bigint, tipoEntregaId: bigint) {
    await this.validarClienteETipo(clienteId, tipoEntregaId);
    return this.repository.attach(clienteId, tipoEntregaId);
  }

  async atualizarTipoEntrega(clienteId: bigint, tipoEntregaId: bigint) {
    await this.validarClienteETipo(clienteId, tipoEntregaId);
    const vinculo = await this.repository.replaceForUser(clienteId, tipoEntregaId);
    return {
      code: 201,
      status: 'success',
      message: 'Tipo de entrega atualizado com sucesso!',
      data: vinculo,
    };
  }

  private async validarClienteETipo(clienteId: bigint, tipoEntregaId: bigint) {
    const [cliente, tipo] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: clienteId, deletedAt: null } }),
      this.prisma.tipoEntrega.findUnique({ where: { id: tipoEntregaId } }),
    ]);
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    if (!tipo) {
      throw new BusinessException(
        'Tipo de entrega informado não existe.',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}

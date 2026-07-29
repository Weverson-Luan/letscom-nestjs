import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/** Espelha o RemessaResponsabilidadeClienteService (ciência do cliente). */
@Injectable()
export class RemessaResponsabilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  listarAll() {
    return this.prisma.remessaResponsabilidade.findMany({ orderBy: { id: 'desc' } });
  }

  async visualizar(id: bigint) {
    const registro = await this.prisma.remessaResponsabilidade.findUnique({ where: { id } });
    if (!registro) throw new NotFoundException('Ciência não encontrada.');
    return registro;
  }

  salvar(data: { cliente_id: number; nome: string; documento: string }) {
    return this.prisma.remessaResponsabilidade.create({
      data: {
        clienteId: BigInt(data.cliente_id),
        nome: data.nome,
        documento: data.documento,
        ativo: true,
        dataCiencia: new Date(),
      },
    });
  }

  async atualizar(id: bigint, data: { numero_documento?: string; ativo?: boolean }) {
    await this.visualizar(id);
    return this.prisma.remessaResponsabilidade.update({
      where: { id },
      data: {
        ...(data.numero_documento !== undefined ? { documento: data.numero_documento } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });
  }

  async deletar(id: bigint) {
    await this.visualizar(id);
    await this.prisma.remessaResponsabilidade.delete({ where: { id } });
    return { success: true };
  }
}

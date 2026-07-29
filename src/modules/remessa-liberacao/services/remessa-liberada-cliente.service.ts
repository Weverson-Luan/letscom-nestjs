import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { LiberarRemessaClienteDto } from '../dto/liberar-remessa-cliente.dto';
import { UpdateRemessaLiberadaClienteDto } from '../dto/update-remessa-liberada-cliente.dto';
import { mapRemessaLiberadaCliente } from '../mappers/remessa-liberada.mapper';
import { RemessaLiberadaClienteRepository } from '../repositories/remessa-liberada-cliente.repository';

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string };

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);

@Injectable()
export class RemessaLiberadaClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RemessaLiberadaClienteRepository,
    private readonly storage: StorageService,
  ) {}

  async liberarRemessaParaCliente(
    dto: LiberarRemessaClienteDto,
    user: AuthUser,
    file?: MulterFile,
  ) {
    const remessa = await this.prisma.remessa.findFirst({
      where: { id: BigInt(dto.remessa_id), deletedAt: null },
      include: { cliente: true },
    });

    if (!remessa) {
      throw new BusinessException('Remessa não encontrada!');
    }

    const executor = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!executor) {
      throw new BusinessException('Executor não encontrado!');
    }

    let filePath: string | null = null;
    if (file) {
      filePath = await this.uploadArquivoCliente(file, remessa.id);
    }

    const registro = await this.repository.create({
      remessa: { connect: { id: remessa.id } },
      executor: { connect: { id: executor.id } },
      tipoEntrega: { connect: { id: BigInt(dto.tipo_entrega_id) } },
      observacao: dto.observacao ?? null,
      outros: dto.outros ?? null,
      filePath,
    });

    return mapRemessaLiberadaCliente(registro);
  }

  async listarTodasLiberacoesPaginadas(query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.max(1, Number(query.per_page ?? 10));
    const { items, total } = await this.repository.paginate(page, perPage);
    return {
      data: items.map(mapRemessaLiberadaCliente),
      pagination: buildPagination(total, page, perPage),
    };
  }

  async listarPorId(id: bigint) {
    const item = await this.repository.find(id);
    return mapRemessaLiberadaCliente(item);
  }

  async atualizar(id: bigint, dto: UpdateRemessaLiberadaClienteDto) {
    const data: Record<string, unknown> = {};
    if (dto.remessa_id !== undefined) {
      data.remessa = { connect: { id: BigInt(dto.remessa_id) } };
    }
    if (dto.user_id_executor !== undefined) {
      data.executor = { connect: { id: BigInt(dto.user_id_executor) } };
    }
    if (dto.tipo_entrega_id !== undefined) {
      data.tipoEntrega = { connect: { id: BigInt(dto.tipo_entrega_id) } };
    }
    if (dto.file_path !== undefined) data.filePath = dto.file_path;
    if (dto.data_entrega !== undefined) data.dataEntrega = new Date(dto.data_entrega);
    if (dto.observacao !== undefined) data.observacao = dto.observacao;
    if (dto.outros !== undefined) data.outros = dto.outros;

    const item = await this.repository.update(id, data);
    return mapRemessaLiberadaCliente(item);
  }

  async excluir(id: bigint) {
    await this.repository.delete(id);
  }

  private async uploadArquivoCliente(
    file: MulterFile,
    remessaId: bigint,
  ): Promise<string> {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      throw new BusinessException('Arquivo inválido. Use jpg, jpeg, png ou pdf.');
    }

    const filename = `${randomUUID()}${ext}`;
    const relative = `remessas-liberadas-cliente/${remessaId}/file/${filename}`;
    await this.storage.put(relative, file.buffer);
    return relative;
  }
}

import {
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { resolvePagination } from 'src/shared/database/pagination';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { buildPagination } from 'src/shared/utils/api-response';
import { CreateEntregaClienteDto, UpdateEntregaClienteDto } from '../dto/entrega-cliente.dto';
import { EntregaClienteRepository } from '../repositories/entrega-cliente.repository';

type UploadFile = { buffer: Buffer; originalname: string; mimetype?: string };

@Injectable()
export class EntregaClienteService {
  constructor(
    private readonly repository: EntregaClienteRepository,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listar(query: Record<string, unknown>) {
    const { page, perPage, skip, take } = resolvePagination(query, 10, 100);
    const { data, total } = await this.repository.paginate({ skip, take });
    return { data, pagination: buildPagination(total, page, perPage) };
  }

  async buscar(id: bigint) {
    const entrega = await this.repository.findById(id);
    if (!entrega) throw new NotFoundException('Entrega não encontrada.');
    return entrega;
  }

  async registrar(dto: CreateEntregaClienteDto, imagem?: UploadFile) {
    const remessa = await this.prisma.remessa.findFirst({
      where: { id: BigInt(dto.remessa_id), deletedAt: null },
    });
    if (!remessa) {
      throw new BusinessException(
        'Remessa não encontrada.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let imagemProtocolo: string | undefined;
    if (imagem) {
      this.validarImagem(imagem);
      const ext = extname(imagem.originalname) || '.jpg';
      const path = `entregas/protocolos/${randomUUID()}${ext}`;
      await this.storage.put(path, imagem.buffer);
      imagemProtocolo = path;
    }

    return this.repository.create({
      remessa: { connect: { id: remessa.id } },
      responsavelRecebimento: dto.responsavel_recebimento,
      imagemProtocolo,
      dataEntrega: new Date(),
    });
  }

  async atualizar(id: bigint, dto: UpdateEntregaClienteDto, imagem?: UploadFile) {
    await this.buscar(id);
    const data: { responsavelRecebimento?: string; imagemProtocolo?: string } = {};
    if (dto.responsavel_recebimento !== undefined) {
      data.responsavelRecebimento = dto.responsavel_recebimento;
    }
    if (imagem) {
      this.validarImagem(imagem);
      const ext = extname(imagem.originalname) || '.jpg';
      const path = `entregas/protocolos/${randomUUID()}${ext}`;
      await this.storage.put(path, imagem.buffer);
      data.imagemProtocolo = path;
    }
    return this.repository.update(id, data);
  }

  async excluir(id: bigint) {
    await this.buscar(id);
    await this.repository.delete(id);
  }

  private validarImagem(file: UploadFile) {
    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (file.mimetype && !allowed.has(file.mimetype)) {
      throw new BusinessException(
        'A imagem do protocolo deve ser jpg, jpeg ou png.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (file.buffer.length > 2 * 1024 * 1024) {
      throw new BusinessException(
        'A imagem do protocolo deve ter no máximo 2MB.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}

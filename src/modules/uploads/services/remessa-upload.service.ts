import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { ZipService } from 'src/shared/utils/zip.service';
import { v4 as uuidv4 } from 'uuid';

export type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};

/**
 * Uploads avulsos de fotos (ZIP) e planilha para remessa existente.
 * Espelha RemessaFotoService::processZip e RemessaPlanilhaService::upload.
 */
@Injectable()
export class RemessaUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly zip: ZipService,
  ) {}

  private async clienteIdDaRemessa(remessaId: bigint): Promise<bigint> {
    const remessa = await this.prisma.remessa.findUnique({
      where: { id: remessaId },
      select: { clienteId: true },
    });
    if (!remessa) throw new NotFoundException('Remessa não encontrada.');
    return remessa.clienteId;
  }

  async processZipFotos(remessaId: bigint, file: UploadFile): Promise<string[]> {
    const clienteId = await this.clienteIdDaRemessa(remessaId);
    const entries = await this.zip.extract(file.buffer);
    const saved: string[] = [];

    for (const entry of entries) {
      if (this.ignorarEntrada(entry.name)) continue;
      const path = this.storage.montarCaminho(`remessas/fotos/${remessaId}/${entry.name}`);
      await this.storage.put(path, entry.buffer);
      await this.prisma.remessaFoto.create({
        data: { remessaId, clienteId, filePath: path },
      });
      saved.push(path);
    }
    return saved;
  }

  async uploadPlanilha(remessaId: bigint, file: UploadFile, tipo?: string) {
    const clienteId = await this.clienteIdDaRemessa(remessaId);
    const ext = (file.originalname.split('.').pop() ?? 'xlsx').toLowerCase();
    const path = this.storage.montarCaminho(`remessas/planilhas/${remessaId}/${uuidv4()}.${ext}`);
    await this.storage.put(path, file.buffer);

    return this.prisma.remessaPlanilha.create({
      data: {
        remessaId,
        clienteId,
        filePath: path,
        tipo: tipo ?? ext,
      },
    });
  }

  private ignorarEntrada(name: string): boolean {
    const n = name.replace(/\\/g, '/');
    if (n.endsWith('/')) return true;
    if (n.includes('__MACOSX')) return true;
    const base = n.split('/').pop() ?? n;
    return base === '.DS_Store' || base.startsWith('._');
  }
}

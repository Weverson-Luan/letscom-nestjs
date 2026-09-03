/**
 * IMPORTS
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Readable } from 'stream';

/**
 * Abstração de storage espelhando o comportamento do Laravel:
 * disco `local` (storage/app) em dev e `r2` (Cloudflare R2 / S3-compat) em prod,
 * selecionado por FILESYSTEM_DISK. Reúne o Storage::disk(...) + o R2Service.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;
  private bucket?: string;
  private disk: string;
  private readonly localRoot = join(process.cwd(), 'storage', 'app');

  constructor(private readonly config: ConfigService) {
    this.disk = this.config.get<string>('storage.disk') ?? 'local';
  }

  onModuleInit() {
    if (this.usesR2()) {
      const r2 = this.config.get('storage.r2');
      this.bucket = r2.bucket;
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: r2.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
      });
    }
  }

  usesR2(): boolean {
    return this.disk === 'r2';
  }

  /** Faz upload de um conteúdo (Buffer/string) para o caminho informado. */
  async put(path: string, content: Buffer | string): Promise<string> {
    if (this.usesR2()) {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: content,
        }),
      );
      return path;
    }

    const fullPath = join(this.localRoot, path);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return path;
  }

  /** Baixa o conteúdo binário de um arquivo. Retorna null em caso de erro. */
  async download(path: string): Promise<Buffer | null> {
    try {
      if (this.usesR2()) {
        const result = await this.s3!.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: path }),
        );
        return await this.streamToBuffer(result.Body as Readable);
      }
      return await fs.readFile(join(this.localRoot, path));
    } catch (error) {
      this.logger.error(`Erro ao baixar arquivo (${path}): ${(error as Error).message}`);
      return null;
    }
  }

  async exists(path: string): Promise<boolean> {
    if (this.usesR2()) {
      const content = await this.download(path);
      return content !== null;
    }
    try {
      await fs.access(join(this.localRoot, path));
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string): Promise<void> {
    if (this.usesR2()) {
      await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));
      return;
    }
    await fs.rm(join(this.localRoot, path), { force: true });
  }

  /** Remove um "diretório" (prefixo no R2 / pasta local). */
  async deleteDirectory(prefix: string): Promise<void> {
    if (this.usesR2()) {
      const listed = await this.s3!.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
      );
      const objects = (listed.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (objects.length > 0) {
        await this.s3!.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects },
          }),
        );
      }
      return;
    }
    await fs.rm(join(this.localRoot, prefix), { recursive: true, force: true });
  }

  /**
   * Gera uma URL assinada temporária (equivalente ao R2Service::getSignedUrl).
   * No disco local retorna um caminho relativo servível pela app.
   */
  async getSignedUrl(path: string): Promise<string> {
    if (this.usesR2()) {
      const expiresIn = this.config.get<number>('storage.signedUrlExpiration') ?? 900;
      return getSignedUrl(
        this.s3!,
        new GetObjectCommand({ Bucket: this.bucket, Key: path }),
        { expiresIn },
      );
    }
    const appUrl = this.config.get<string>('app.url');
    return `${appUrl}/storage/${path}`;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { StorageService } from 'src/shared/storage/storage.service';
import { ZipService } from 'src/shared/utils/zip.service';

// repository / helpers
import { EnviarFotosRemessaRepository } from '../repositories/enviar-fotos-remessa.repository';
import { deveIgnorarEntradaDoZip } from './helpers/deve-ignorar-entrada-do-zip.helper';

// exceptions
import { ArquivoObrigatorioException } from '../exceptions/arquivo-obrigatorio.exception';
import { RemessaNaoEncontradaException } from '../exceptions/remessa-nao-encontrada.exception';

// typings
import { ArquivoEnviado } from '../uploads.types';

/**
 * Extrai as fotos do ZIP para `remessas/fotos/{remessaId}/` e registra cada uma.
 * Espelha RemessaFotoService::processZip. Devolve os caminhos gravados.
 */
@Injectable()
export class EnviarFotosRemessaService {
  constructor(
    private readonly repository: EnviarFotosRemessaRepository,
    private readonly storage: StorageService,
    private readonly zip: ZipService,
  ) {}

  async execute(remessaId: bigint, arquivo?: ArquivoEnviado): Promise<string[]> {
    if (!arquivo) throw new ArquivoObrigatorioException('zip_file');

    const remessa = await this.repository.buscarClienteDaRemessa(remessaId);
    if (!remessa) throw new RemessaNaoEncontradaException();

    const entradas = await this.zip.extract(arquivo.buffer);
    const caminhosGravados: string[] = [];

    for (const entrada of entradas) {
      if (deveIgnorarEntradaDoZip(entrada.name)) continue;
      const caminho = this.storage.montarCaminho(`remessas/fotos/${remessaId}/${entrada.name}`);
      await this.storage.put(caminho, entrada.buffer);
      await this.repository.registrarFoto({
        remessaId,
        clienteId: remessa.clienteId,
        filePath: caminho,
      });
      caminhosGravados.push(caminho);
    }
    return caminhosGravados;
  }
}

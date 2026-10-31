/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// shared
import { StorageService } from 'src/shared/storage/storage.service';

// repository
import { EnviarPlanilhaRemessaRepository } from '../repositories/enviar-planilha-remessa.repository';

// exceptions
import { ArquivoObrigatorioException } from '../exceptions/arquivo-obrigatorio.exception';
import { RemessaNaoEncontradaException } from '../exceptions/remessa-nao-encontrada.exception';

// typings
import { ArquivoEnviado } from '../uploads.types';

/**
 * Grava a planilha em `remessas/planilhas/{remessaId}/{uuid}.{extensao}` e registra.
 * Espelha RemessaPlanilhaService::upload. Sem `tipo`, usa a extensão do arquivo.
 */
@Injectable()
export class EnviarPlanilhaRemessaService {
  constructor(
    private readonly repository: EnviarPlanilhaRemessaRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(remessaId: bigint, arquivo?: ArquivoEnviado, tipo?: string) {
    if (!arquivo) throw new ArquivoObrigatorioException('file');

    const remessa = await this.repository.buscarClienteDaRemessa(remessaId);
    if (!remessa) throw new RemessaNaoEncontradaException();

    const extensao = (arquivo.originalname.split('.').pop() ?? 'xlsx').toLowerCase();

    const caminho = this.storage.montarCaminho(
      `remessas/planilhas/${remessaId}/${uuidv4()}.${extensao}`,
    );
    await this.storage.put(caminho, arquivo.buffer);

    return this.repository.registrarPlanilha({
      remessaId,
      clienteId: remessa.clienteId,
      filePath: caminho,
      tipo: tipo ?? extensao,
    });
  }
}

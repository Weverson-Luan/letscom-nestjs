import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoCompromissoNaoEncontradoException } from '../exceptions/anexo-compromisso-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { montarContentDisposition } from './helpers/montar-content-disposition.helper';

/** Conteúdo do anexo do compromisso, servido pela API (com auth, só equipe interna). */
@Injectable()
export class BaixarAnexoCompromissoClienteService {
  constructor(
    private readonly repository: ClienteCompromissoRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(clienteId: bigint, compromissoId: bigint, anexoId: bigint) {
    const anexo = await this.repository.buscarAnexo(clienteId, compromissoId, anexoId);
    if (!anexo) throw new AnexoCompromissoNaoEncontradoException();

    const conteudo = await this.storage.download(anexo.filePath);
    if (!conteudo) throw new AnexoCompromissoNaoEncontradoException();

    return {
      conteudo,
      disposicao: montarContentDisposition(anexo.nomeOriginal),
      mimeType: anexo.mimeType ?? 'application/octet-stream',
    };
  }
}

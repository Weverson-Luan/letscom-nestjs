import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoAnotacaoNaoEncontradoException } from '../exceptions/anexo-anotacao-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaAcessoService } from './conversa-acesso.service';
import { montarContentDisposition } from './helpers/montar-content-disposition.helper';

/** Conteúdo do anexo, servido pela API (com auth e só para participantes) em vez de URL pública. */
@Injectable()
export class BaixarAnexoAnotacaoClienteService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly storage: StorageService,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(clienteId: bigint, anotacaoId: bigint, anexoId: bigint, usuario: AuthUser) {
    await this.acesso.garantirAcesso(clienteId, usuario);
    const anexo = await this.repository.buscarAnexo(clienteId, anotacaoId, anexoId);
    if (!anexo) throw new AnexoAnotacaoNaoEncontradoException();

    const conteudo = await this.storage.download(anexo.filePath);
    if (!conteudo) throw new AnexoAnotacaoNaoEncontradoException();

    return {
      conteudo,
      disposicao: montarContentDisposition(anexo.nomeOriginal),
      mimeType: anexo.mimeType ?? 'application/octet-stream',
    };
  }
}

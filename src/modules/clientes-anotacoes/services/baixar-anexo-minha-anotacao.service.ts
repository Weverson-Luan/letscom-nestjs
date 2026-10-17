import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoAnotacaoNaoEncontradoException } from '../exceptions/anexo-anotacao-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { montarContentDisposition } from './helpers/montar-content-disposition.helper';
import { extrairClienteIdDoUsuario } from './helpers/resolver-usuario-anotacao.helper';

/** Download de anexo pelo cliente: só de anotações da própria empresa. */
@Injectable()
export class BaixarAnexoMinhaAnotacaoService {
  constructor(
    private readonly repository: ClienteAnotacaoRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(anotacaoId: bigint, anexoId: bigint, usuario: AuthUser) {
    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId) throw new AnexoAnotacaoNaoEncontradoException();

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

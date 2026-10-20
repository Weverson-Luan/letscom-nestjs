import { Injectable } from '@nestjs/common';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoMensagemNaoEncontradoException } from '../exceptions/anexo-mensagem-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from './conversa-acesso.service';
import { montarContentDisposition } from './helpers/montar-content-disposition.helper';
import { calcularVisivelDesde } from './helpers/participante-conversa.helper';
import { extrairClienteIdDoUsuario } from './helpers/resolver-usuario-conversa.helper';

/** Download de anexo pelo cliente: só de mensagens da própria empresa e se participa da conversa. */
@Injectable()
export class BaixarAnexoMinhaConversaService {
  constructor(
    private readonly repository: ConversaMensagemRepository,
    private readonly storage: StorageService,
    private readonly acesso: ConversaAcessoService,
  ) {}

  async execute(mensagemId: bigint, anexoId: bigint, usuario: AuthUser) {
    const clienteId = extrairClienteIdDoUsuario(usuario);
    if (!clienteId) throw new AnexoMensagemNaoEncontradoException();
    const acesso = await this.acesso.garantirAcesso(clienteId, usuario);

    const anexo = await this.repository.buscarAnexo(
      clienteId,
      mensagemId,
      anexoId,
      calcularVisivelDesde(acesso, clienteId, usuario),
    );
    if (!anexo) throw new AnexoMensagemNaoEncontradoException();

    const conteudo = await this.storage.download(anexo.filePath);
    if (!conteudo) throw new AnexoMensagemNaoEncontradoException();

    return {
      conteudo,
      disposicao: montarContentDisposition(anexo.nomeOriginal),
      mimeType: anexo.mimeType ?? 'application/octet-stream',
    };
  }
}

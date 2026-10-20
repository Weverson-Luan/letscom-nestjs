import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { MensagemComRelacoes } from '../repositories/conversa-mensagem.repository';
import {
  ehAutorMensagem,
  podeEditarMensagem,
  podeExcluirMensagem,
} from '../services/helpers/permissoes-mensagem.helper';

const AUTOR_REMOVIDO = 'Usuário removido';

function mapearAutor(mensagem: MensagemComRelacoes) {
  if (mensagem.autorTipo === 'subordinado') {
    const subordinado = mensagem.autorSubordinado;
    return {
      id: mensagem.autorSubordinadoId,
      nome: subordinado?.nome?.trim() || subordinado?.email || AUTOR_REMOVIDO,
      tipo: mensagem.autorTipo,
    };
  }
  return {
    id: mensagem.autorId,
    nome: mensagem.autor?.nome ?? AUTOR_REMOVIDO,
    tipo: mensagem.autorTipo,
  };
}

/**
 * Mensagem na resposta HTTP. `eh_minha` e `pode_*` são calculados para o usuário logado
 * (o front só usa para alinhar a mensagem e esconder botões; a API revalida).
 */
export function mapearMensagemConversa(mensagem: MensagemComRelacoes, usuario: AuthUser) {
  return {
    id: mensagem.id,
    cliente_id: mensagem.clienteId,
    conteudo: mensagem.conteudo,
    autor: mapearAutor(mensagem),
    eh_minha: ehAutorMensagem(mensagem, usuario),
    editada: mensagem.editadaEm !== null,
    editada_em: mensagem.editadaEm,
    pode_editar: podeEditarMensagem(mensagem, usuario),
    pode_excluir: podeExcluirMensagem(mensagem, usuario),
    created_at: mensagem.createdAt,
    updated_at: mensagem.updatedAt,
    anexos: mensagem.anexos.map((anexo) => ({
      id: anexo.id,
      nome_original: anexo.nomeOriginal,
      mime_type: anexo.mimeType,
      tamanho_bytes: anexo.tamanhoBytes,
      created_at: anexo.createdAt,
    })),
  };
}

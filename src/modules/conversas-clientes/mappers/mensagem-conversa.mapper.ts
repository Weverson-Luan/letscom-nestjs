import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { AnotacaoComRelacoes } from '../repositories/cliente-anotacao.repository';
import {
  ehAutorAnotacao,
  podeEditarAnotacao,
  podeExcluirAnotacao,
} from '../services/helpers/permissoes-anotacao.helper';

const AUTOR_REMOVIDO = 'Usuário removido';

function mapearAutor(anotacao: AnotacaoComRelacoes) {
  if (anotacao.autorTipo === 'subordinado') {
    const subordinado = anotacao.autorSubordinado;
    return {
      id: anotacao.autorSubordinadoId,
      nome: subordinado?.nome?.trim() || subordinado?.email || AUTOR_REMOVIDO,
      tipo: anotacao.autorTipo,
    };
  }
  return {
    id: anotacao.autorId,
    nome: anotacao.autor?.nome ?? AUTOR_REMOVIDO,
    tipo: anotacao.autorTipo,
  };
}

/**
 * Anotação na resposta HTTP. `eh_minha` e `pode_*` são calculados para o usuário logado
 * (o front só usa para alinhar a mensagem e esconder botões; a API revalida).
 */
export function mapearAnotacaoCliente(anotacao: AnotacaoComRelacoes, usuario: AuthUser) {
  return {
    id: anotacao.id,
    cliente_id: anotacao.clienteId,
    tipo: anotacao.tipo,
    conteudo: anotacao.conteudo,
    autor: mapearAutor(anotacao),
    eh_minha: ehAutorAnotacao(anotacao, usuario),
    editada: anotacao.editadaEm !== null,
    editada_em: anotacao.editadaEm,
    pode_editar: podeEditarAnotacao(anotacao, usuario),
    pode_excluir: podeExcluirAnotacao(anotacao, usuario),
    created_at: anotacao.createdAt,
    updated_at: anotacao.updatedAt,
    anexos: anotacao.anexos.map((anexo) => ({
      id: anexo.id,
      nome_original: anexo.nomeOriginal,
      mime_type: anexo.mimeType,
      tamanho_bytes: anexo.tamanhoBytes,
      created_at: anexo.createdAt,
    })),
  };
}

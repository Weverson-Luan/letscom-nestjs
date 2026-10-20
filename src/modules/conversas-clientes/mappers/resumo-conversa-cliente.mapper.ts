import { LinhaResumoCliente } from '../repositories/conversa-cliente-resumo.repository';

/** Cliente na lista da tela de mensagens (sem dados sensíveis). */
export function mapearResumoConversaCliente(linha: LinhaResumoCliente) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    documento: linha.documento,
    ativo: Boolean(linha.ativo),
    total_mensagens: Number(linha.total_mensagens),
    ultima_mensagem_em: linha.ultima_mensagem_em,
  };
}

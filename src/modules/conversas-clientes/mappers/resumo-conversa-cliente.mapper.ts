import { LinhaResumoCliente } from '../repositories/cliente-resumo-anotacoes.repository';

/** Cliente na lista da tela de anotações (sem dados sensíveis). */
export function mapearResumoClienteAnotacoes(linha: LinhaResumoCliente) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone,
    documento: linha.documento,
    ativo: Boolean(linha.ativo),
    total_anotacoes: Number(linha.total_anotacoes),
    ultima_anotacao_em: linha.ultima_anotacao_em,
  };
}

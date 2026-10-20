import { AtividadeRecenteBruta, TipoAtividadeRecente } from '../repositories/dashboard.repository';

export interface AtividadeRecenteResposta {
  tipo: TipoAtividadeRecente;
  descricao: string;
  created_at: string;
}

function montarDescricao(atividade: AtividadeRecenteBruta): string {
  const numero = atividade.numero === null ? '' : String(atividade.numero);
  const sufixoNome = atividade.nome ? ` por ${atividade.nome}` : '';

  switch (atividade.tipo) {
    case 'remessa_criada':
      return `Nova remessa #${numero} criada${sufixoNome}.`;
    case 'status_alterado':
      return `Remessa #${numero} avançou para ${atividade.status}${sufixoNome}.`;
    case 'fotos_enviadas':
      return `Lote com ${Number(atividade.quantidade ?? 0)} fotos enviado para remessa #${numero}.`;
    case 'cliente_cadastrado':
      return `Novo cliente cadastrado: ${atividade.nome}.`;
  }
}

/** Monta a atividade no formato da API ({ tipo, descricao, created_at ISO }). */
export function mapearAtividadeRecente(atividade: AtividadeRecenteBruta): AtividadeRecenteResposta {
  return {
    tipo: atividade.tipo,
    descricao: montarDescricao(atividade),
    created_at: new Date(atividade.created_at ?? 0).toISOString(),
  };
}

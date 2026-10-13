import { Feature as F } from './features';

/**
 * O PUT /remessas/:id atende várias ações (pegar, finalizar, devolver, liberar,
 * observação...). Aqui cada payload é traduzido para as features exigidas —
 * espelha App\Support\Auth\RemessaAcaoFeatures do Laravel.
 */

/** Campos aceitos no payload de atualização da remessa. */
export const REMESSA_CAMPOS_PERMITIDOS = [
  'user_id_executor',
  'observacao',
  'situacao',
  'status',
  'data_inicio_producao',
  'data_fim_producao',
];

/**
 * Grupos de features exigidos: o usuário precisa de pelo menos uma feature de
 * cada grupo.
 */
export function featuresExigidasParaRemessa(data: Record<string, unknown>): string[][] {
  const grupos: string[][] = [];

  if ('observacao' in data) {
    grupos.push([F.ADICIONAR_OBSERVACAO_REMESSAS]);
  }

  const situacao = data.situacao ?? data.status ?? null;

  if (situacao !== null && situacao !== undefined) {
    grupos.push(porSituacao(String(situacao), data));
  }

  return grupos;
}

function porSituacao(situacao: string, data: Record<string, unknown>): string[] {
  if (situacao === 'cancelada') return [F.PEGAR_TAREFA_REMESSAS, F.MINHAS_TAREFA_REMESSAS];
  if ('data_inicio_producao' in data) return [F.PEGAR_TAREFA_REMESSAS];
  if (situacao === 'em_producao' && 'data_fim_producao' in data) return [F.DEVOLVER_REMESSAS];
  if (situacao === 'conferido') return [F.FINALIZAR_TAREFA_REMESSAS];
  if (situacao === 'pedido_liberado') {
    return [F.LIBERACAO_REMESSA_BALCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_BALCAO];
  }
  if (situacao === 'concluido') {
    return [F.LIBERACAO_REMESSAS_RECEPCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO];
  }
  return [F.MINHAS_TAREFA_REMESSAS];
}

/**
 * Status registrado no histórico (POST /remessas/:id/status), sempre após uma
 * das ações acima.
 */
export function featuresExigidasParaStatus(status: string): string[] {
  switch (status) {
    case 'em_producao':
      return [F.PEGAR_TAREFA_REMESSAS, F.DEVOLVER_REMESSAS, F.MINHAS_TAREFA_REMESSAS];
    case 'conferido':
      return [F.FINALIZAR_TAREFA_REMESSAS];
    case 'pedido_liberado':
      return [F.LIBERACAO_REMESSA_BALCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_BALCAO];
    case 'concluido':
      return [F.LIBERACAO_REMESSAS_RECEPCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO];
    case 'cancelada':
      return [F.PEGAR_TAREFA_REMESSAS, F.MINHAS_TAREFA_REMESSAS];
    default:
      return [F.MINHAS_TAREFA_REMESSAS];
  }
}

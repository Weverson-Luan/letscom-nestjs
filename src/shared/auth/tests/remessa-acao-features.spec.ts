import { Feature as F } from '../features';
import { featuresExigidasParaRemessa, featuresExigidasParaStatus } from '../remessa-acao-features';

describe('RemessaAcaoFeatures', () => {
  it('observação exige adicionar_observacao_remessas', () => {
    expect(featuresExigidasParaRemessa({ observacao: 'x' })).toEqual([
      [F.ADICIONAR_OBSERVACAO_REMESSAS],
    ]);
  });

  it('traduz cada ação do PUT para as features exigidas', () => {
    expect(featuresExigidasParaRemessa({ situacao: 'cancelada', status: 'cancelada' })).toEqual([
      [F.PEGAR_TAREFA_REMESSAS, F.MINHAS_TAREFA_REMESSAS],
    ]);
    expect(
      featuresExigidasParaRemessa({ status: 'em_producao', data_inicio_producao: 'x' }),
    ).toEqual([[F.PEGAR_TAREFA_REMESSAS]]);
    expect(featuresExigidasParaRemessa({ status: 'em_producao', data_fim_producao: null })).toEqual(
      [[F.DEVOLVER_REMESSAS]],
    );
    expect(featuresExigidasParaRemessa({ status: 'conferido' })).toEqual([
      [F.FINALIZAR_TAREFA_REMESSAS],
    ]);
    expect(featuresExigidasParaRemessa({ status: 'pedido_liberado' })).toEqual([
      [F.LIBERACAO_REMESSA_BALCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_BALCAO],
    ]);
    expect(featuresExigidasParaRemessa({ situacao: 'concluido' })).toEqual([
      [F.LIBERACAO_REMESSAS_RECEPCAO, F.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO],
    ]);
    expect(featuresExigidasParaRemessa({ status: 'outro' })).toEqual([[F.MINHAS_TAREFA_REMESSAS]]);
  });

  it('combina observação e situação em grupos separados', () => {
    expect(featuresExigidasParaRemessa({ observacao: 'x', status: 'conferido' })).toEqual([
      [F.ADICIONAR_OBSERVACAO_REMESSAS],
      [F.FINALIZAR_TAREFA_REMESSAS],
    ]);
  });

  it('status do histórico', () => {
    expect(featuresExigidasParaStatus('em_producao')).toEqual([
      F.PEGAR_TAREFA_REMESSAS,
      F.DEVOLVER_REMESSAS,
      F.MINHAS_TAREFA_REMESSAS,
    ]);
    expect(featuresExigidasParaStatus('concluido')).toEqual([
      F.LIBERACAO_REMESSAS_RECEPCAO,
      F.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO,
    ]);
  });
});

// Partes comuns dos testes de carga de POST /remessas (sem e com planilha).
// Variáveis do cenário, no .env ou no comando (-- -e NOME=...):
//   K6_CLIENTE_ID         cliente (users.id) com créditos confirmados do produto
//   K6_PRODUTO_ID         produto de crédito ativo
//   K6_MODELO_TECNICO_ID  modelo técnico ativo SEM carga de foto
//   K6_TECNOLOGIA_ID      tecnologia
//   K6_SOLICITANTE_ID     (opcional) solicitante; default = K6_CLIENTE_ID
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { autenticar } from './autenticar.js';
import { BASE_URL } from './configuracao.js';

const remessasCriadas = new Counter('remessas_criadas');
const remessasRecusadas = new Counter('remessas_recusadas_422');
const remessasErroInterno = new Counter('remessas_erro_interno_500');

// cada VU tem sua própria cópia desta variável
let temFalhaExibida = false;

function lerVariavel(nome, padrao) {
  const valor = __ENV[nome] || padrao;
  if (!valor) {
    throw new Error(`Informe ${nome}: no .env ou no comando (-- -e ${nome}=...)`);
  }
  return String(valor);
}

function consultarSaldo(token, clienteId, produtoId) {
  const resposta = http.get(`${BASE_URL}/vendas_creditos/cliente/${clienteId}/creditos`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'GET /vendas_creditos/cliente/:id/creditos' },
  });
  if (resposta.status !== 200) {
    throw new Error(`Consulta de saldo falhou (${resposta.status}): ${resposta.body}`);
  }
  const credito = (resposta.json('data.creditos') || []).find(
    (c) => String(c.produto_id) === produtoId,
  );
  return credito ? credito.total : 0;
}

/**
 * Para o setup(): login, IDs do cenário e saldo inicial.
 * Para o teste se o saldo não cobrir nem uma remessa.
 */
export function prepararCenario(creditosPorRemessa) {
  const token = autenticar();
  const clienteId = lerVariavel('K6_CLIENTE_ID');
  const produtoId = lerVariavel('K6_PRODUTO_ID');
  const cenario = {
    token,
    clienteId,
    produtoId,
    modeloTecnicoId: lerVariavel('K6_MODELO_TECNICO_ID'),
    tecnologiaId: lerVariavel('K6_TECNOLOGIA_ID'),
    solicitanteId: lerVariavel('K6_SOLICITANTE_ID', clienteId),
  };

  const saldoInicial = consultarSaldo(token, clienteId, produtoId);
  if (saldoInicial < creditosPorRemessa) {
    throw new Error(
      `Cliente ${clienteId} com saldo ${saldoInicial} no produto ${produtoId}; ` +
        `cada remessa gasta ${creditosPorRemessa}. Lance créditos antes (ver docs/teste-de-carga.md).`,
    );
  }
  console.log(`Saldo inicial do cliente ${clienteId}, produto ${produtoId}: ${saldoInicial}`);

  return { ...cenario, saldoInicial };
}

/** Campos do body de POST /remessas comuns aos cenários (sem arquivos). */
export function montarCorpoBase(cenario, totalSolicitacoes) {
  return {
    cliente_id: cenario.clienteId,
    user_id_solicitante_remessa: cenario.solicitanteId,
    modelo_tecnico_id: cenario.modeloTecnicoId,
    tecnologia_id: cenario.tecnologiaId,
    produto_id: cenario.produtoId,
    total_solicitacoes: String(totalSolicitacoes),
    situacao: 'solicitado',
    status: 'envio_de_dados',
    posicao: 'h',
    nome: 'Teste de Carga k6',
    documento: '00000000000', // mesmo documento: reaproveita a ciência de responsabilidade
    observacao: 'carga-k6', // marca as remessas para limpeza depois
  };
}

/** Envia a solicitação, alimenta as métricas e faz os checks. */
export function solicitarRemessa(cenario, corpo) {
  const resposta = http.post(`${BASE_URL}/remessas`, corpo, {
    headers: { Authorization: `Bearer ${cenario.token}` },
    tags: { name: 'POST /remessas' },
  });

  if (resposta.status === 201) remessasCriadas.add(1);
  else if (resposta.status === 422) remessasRecusadas.add(1);
  else if (resposta.status >= 500) remessasErroInterno.add(1);

  // mostra o motivo da primeira falha de cada VU (sem inundar o terminal)
  if (resposta.status !== 201 && !temFalhaExibida) {
    temFalhaExibida = true;
    console.warn(`POST /remessas respondeu ${resposta.status}: ${resposta.body}`);
  }

  check(resposta, {
    'status 201': (r) => r.status === 201,
    'retorna número da remessa': (r) => r.status === 201 && !!r.json('data.numeroRemessa'),
  });

  return resposta;
}

/** Para o teardown(): o saldo nunca pode ficar negativo, mesmo com requisições concorrentes. */
export function conferirSaldoFinal(cenario, creditosPorRemessa) {
  const saldoFinal = consultarSaldo(cenario.token, cenario.clienteId, cenario.produtoId);
  const consumido = cenario.saldoInicial - saldoFinal;
  console.log(
    `Saldo final: ${saldoFinal} (consumido: ${consumido} créditos = ` +
      `${consumido / creditosPorRemessa} remessas). Compare com a métrica remessas_criadas.`,
  );
  check(saldoFinal, { 'saldo não ficou negativo': (s) => s >= 0 });
}

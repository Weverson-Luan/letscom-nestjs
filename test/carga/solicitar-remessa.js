// Carga em POST /remessas: rota de ESCRITA (JWT + papel + feature solicitar_remessas).
// Cada requisição abre uma transação que cria a remessa, a ciência de responsabilidade, o histórico
// de status e uma saída em vendas_creditos (consome créditos); depois invalida o cache do cliente.
// Rode só em banco descartável: cada remessa criada fica no banco (marcada com observacao 'carga-k6').
//
// Precisa de um usuário admin (vê o saldo do cliente) e dos IDs do cenário, no .env ou no comando:
//   K6_CLIENTE_ID         cliente (users.id) com créditos confirmados do produto
//   K6_PRODUTO_ID         produto de crédito ativo
//   K6_MODELO_TECNICO_ID  modelo técnico ativo SEM carga de foto
//   K6_TECNOLOGIA_ID      tecnologia
//   K6_SOLICITANTE_ID     (opcional) solicitante; default = K6_CLIENTE_ID
//
//   npm run carga:solicitar-remessa
//   npm run carga:solicitar-remessa -- -e PERFIL=carga
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { autenticar } from './helpers/autenticar.js';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';

export const options = montarOpcoes({ p95Ms: 1500 });

// créditos consumidos por remessa: 1 para gastar o mínimo de saldo
const CREDITOS_POR_REMESSA = 1;

const remessasCriadas = new Counter('remessas_criadas');
const remessasRecusadas = new Counter('remessas_recusadas_422');
const remessasErroInterno = new Counter('remessas_erro_interno_500');

function lerId(nome, padrao) {
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

/** Roda 1 vez: login, IDs do cenário e saldo inicial (o teste para se não houver crédito). */
export function setup() {
  const token = autenticar();
  const clienteId = lerId('K6_CLIENTE_ID');
  const produtoId = lerId('K6_PRODUTO_ID');
  const cenario = {
    token,
    clienteId,
    produtoId,
    modeloTecnicoId: lerId('K6_MODELO_TECNICO_ID'),
    tecnologiaId: lerId('K6_TECNOLOGIA_ID'),
    solicitanteId: lerId('K6_SOLICITANTE_ID', clienteId),
  };

  const saldoInicial = consultarSaldo(token, clienteId, produtoId);
  if (saldoInicial < CREDITOS_POR_REMESSA) {
    throw new Error(
      `Cliente ${clienteId} sem saldo do produto ${produtoId} (saldo: ${saldoInicial}). ` +
        'Lance créditos antes do teste (ver docs/teste-de-carga.md).',
    );
  }
  console.log(`Saldo inicial do cliente ${clienteId}, produto ${produtoId}: ${saldoInicial}`);

  return { ...cenario, saldoInicial };
}

export default function (cenario) {
  // sem arquivos: mede o fluxo transacional (validação, saldo, remessa, crédito, status, cache)
  const corpo = {
    cliente_id: cenario.clienteId,
    user_id_solicitante_remessa: cenario.solicitanteId,
    modelo_tecnico_id: cenario.modeloTecnicoId,
    tecnologia_id: cenario.tecnologiaId,
    produto_id: cenario.produtoId,
    total_solicitacoes: String(CREDITOS_POR_REMESSA),
    situacao: 'solicitado',
    status: 'envio_de_dados',
    posicao: 'h',
    nome: 'Teste de Carga k6',
    documento: '00000000000', // mesmo documento: reaproveita a ciência de responsabilidade
    observacao: 'carga-k6', // marca as remessas para limpeza depois
  };

  const resposta = http.post(`${BASE_URL}/remessas`, corpo, {
    headers: { Authorization: `Bearer ${cenario.token}` },
    tags: { name: 'POST /remessas' },
  });

  if (resposta.status === 201) remessasCriadas.add(1);
  else if (resposta.status === 422) remessasRecusadas.add(1);
  else if (resposta.status >= 500) remessasErroInterno.add(1);

  check(resposta, {
    'status 201': (r) => r.status === 201,
    'retorna número da remessa': (r) => r.status === 201 && !!r.json('data.numeroRemessa'),
  });

  sleep(1);
}

/** Roda 1 vez no fim: o saldo nunca pode ficar negativo, mesmo com requisições concorrentes. */
export function teardown(cenario) {
  const saldoFinal = consultarSaldo(cenario.token, cenario.clienteId, cenario.produtoId);
  console.log(
    `Saldo final: ${saldoFinal} (consumido: ${cenario.saldoInicial - saldoFinal} créditos). ` +
      'Compare o consumido com a métrica remessas_criadas.',
  );
  check(saldoFinal, { 'saldo não ficou negativo': (s) => s >= 0 });
}

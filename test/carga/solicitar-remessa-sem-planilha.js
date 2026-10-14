// Carga em POST /remessas SEM arquivos: rota de ESCRITA (JWT + papel + feature solicitar_remessas).
// Mede só a transação: valida saldo, cria a remessa, a ciência de responsabilidade, o histórico de
// status e a saída em vendas_creditos; depois invalida o cache do cliente.
// Rode só em banco descartável: cada remessa fica no banco (observacao 'carga-k6'). Limpeza na doc.
// Variáveis do cenário: ver helpers/remessa.js. Precisa de um usuário admin (lê o saldo do cliente).
//
//   npm run carga:solicitar-remessa
//   npm run carga:solicitar-remessa -- -e PERFIL=carga
import { sleep } from 'k6';
import { montarOpcoes } from './helpers/configuracao.js';
import {
  conferirSaldoFinal,
  montarCorpoBase,
  prepararCenario,
  solicitarRemessa,
} from './helpers/remessa.js';

export const options = montarOpcoes({ p95Ms: 1500 });

// créditos consumidos por remessa: 1 para gastar o mínimo de saldo
const CREDITOS_POR_REMESSA = 1;

/** Roda 1 vez: login, IDs do cenário e saldo inicial. */
export function setup() {
  return prepararCenario(CREDITOS_POR_REMESSA);
}

export default function (cenario) {
  solicitarRemessa(cenario, montarCorpoBase(cenario, CREDITOS_POR_REMESSA));
  sleep(1);
}

export function teardown(cenario) {
  conferirSaldoFinal(cenario, CREDITOS_POR_REMESSA);
}

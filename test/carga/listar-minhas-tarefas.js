// Carga em GET /remessas/minhas-tarefas: rota autenticada (JWT + papel + feature minhas_tarefa_remessas)
// com listagem paginada em cache no Redis por usuário + página + busca (REMESSAS_CACHE_TTL).
// Lista remessas em_producao com executor; admin vê todas, os demais papéis só as próprias.
// Precisa de um usuário admin ou producao (no seed, só esses têm a feature minhas_tarefa_remessas).
// Mistura três tipos de requisição, medidos separadamente pela tag `busca`:
//   sem   sem search, páginas 1 a 3: o caminho mais comum, quase sempre acerta o cache
//   comum search com termos repetidos (K6_BUSCAS): acerta o cache depois da primeira vez
//   unica search que nunca se repete: sempre vai ao MySQL (LIKE '%termo%' nos relacionamentos)
//
//   npm run carga:minhas-tarefas
//   npm run carga:minhas-tarefas -- -e PERFIL=carga -e K6_BUSCAS=WLTECH,Maria,50001
import http from 'k6/http';
import { check, sleep } from 'k6';
import { autenticar } from './helpers/autenticar.js';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';

const opcoes = montarOpcoes();
// tira o p95 geral: o critério é por tipo de busca (a busca única é mais lenta por natureza)
const { http_req_duration: _p95Geral, ...demaisLimites } = opcoes.thresholds;

// limites por tipo de busca: também fazem o resumo mostrar o p95 de cada tipo separado
export const options = {
  ...opcoes,
  thresholds: {
    ...demaisLimites,
    'http_req_duration{busca:sem}': ['p(95)<500'],
    'http_req_duration{busca:comum}': ['p(95)<800'],
    'http_req_duration{busca:unica}': ['p(95)<1500'],
  },
};

// termos que existem nos dados de dev (nome de cliente, modelo, executor ou número da remessa)
const BUSCAS = (__ENV.K6_BUSCAS || 'a,WLTECH,admin')
  .split(',')
  .map((termo) => termo.trim())
  .filter((termo) => termo !== '');
if (BUSCAS.length === 0) {
  throw new Error('K6_BUSCAS sem termos: informe ao menos um (ex.: -e K6_BUSCAS=WLTECH,50001)');
}

/** Roda 1 vez antes do teste; o retorno chega como parâmetro em cada iteração. */
export function setup() {
  return { token: autenticar() };
}

/** 50% sem busca, 25% busca comum, 25% busca única. */
function sortearBusca() {
  const sorteio = Math.random();
  if (sorteio < 0.5) return { tipo: 'sem', termo: '' };
  if (sorteio < 0.75) {
    return { tipo: 'comum', termo: BUSCAS[Math.floor(Math.random() * BUSCAS.length)] };
  }
  return { tipo: 'unica', termo: `k6${__VU}x${__ITER}x${Date.now()}` };
}

export default function ({ token }) {
  const pagina = Math.floor(Math.random() * 3) + 1;
  const busca = sortearBusca();
  const url =
    `${BASE_URL}/remessas/minhas-tarefas?page=${pagina}&per_page=10` +
    `&search=${encodeURIComponent(busca.termo)}`;

  const resposta = http.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'GET /remessas/minhas-tarefas', busca: busca.tipo }, // agrupa as URLs no relatório
  });

  check(resposta, {
    'status 200': (r) => r.status === 200,
    'retorna lista': (r) => Array.isArray(r.json('data')),
  });

  sleep(1);
}

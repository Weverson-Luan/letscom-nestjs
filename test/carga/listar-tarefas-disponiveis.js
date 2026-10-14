// Carga em GET /remessas/tarefas-disponiveis: rota autenticada (JWT + papel + feature flag)
// com listagem paginada em cache no Redis (REMESSAS_CACHE_TTL).
// Precisa de um usuário admin ou producao (no seed, só esses têm a feature pegar_tarefa_remessas).
// Credenciais: K6_EMAIL/K6_SENHA no .env (o npm script carrega) ou no comando.
//   npm run carga:remessas
//   npm run carga:remessas -- -e K6_EMAIL=admin@example.com -e K6_SENHA=admin123 -e PERFIL=estresse
import http from 'k6/http';
import { check, sleep } from 'k6';
import { autenticar } from './helpers/autenticar.js';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';

export const options = montarOpcoes({ p95Ms: 800 });

/** Roda 1 vez antes do teste; o retorno chega como parâmetro em cada iteração. */
export function setup() {
  return { token: autenticar() };
}

export default function ({ token }) {
  // páginas variadas: parte das requisições acerta o cache do Redis, parte vai ao banco
  const pagina = Math.floor(Math.random() * 3) + 1;
  const resposta = http.get(`${BASE_URL}/remessas/tarefas-disponiveis?page=${pagina}&per_page=10`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'GET /remessas/tarefas-disponiveis' }, // agrupa as URLs com ?page= no relatório
  });

  check(resposta, {
    'status 200': (r) => r.status === 200,
    'retorna lista': (r) => Array.isArray(r.json('data')),
  });

  sleep(1);
}

import http from 'k6/http';
import { BASE_URL } from './configuracao.js';

/**
 * Faz login uma única vez e devolve o access token.
 * Chame no setup() do script (roda 1 vez), nunca no default (roda a cada iteração):
 * o POST /login tem limite de 30 requisições por minuto (ThrottlerGuard).
 */
export function autenticar() {
  const email = __ENV.K6_EMAIL;
  const senha = __ENV.K6_SENHA;
  if (!email || !senha) {
    throw new Error(
      'Informe K6_EMAIL e K6_SENHA: no .env ou no comando (-- -e K6_EMAIL=... -e K6_SENHA=...)',
    );
  }

  const resposta = http.post(`${BASE_URL}/login`, JSON.stringify({ email, senha }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (resposta.status !== 200) {
    throw new Error(`Login falhou (${resposta.status}): ${resposta.body}`);
  }

  return resposta.json('access_token');
}

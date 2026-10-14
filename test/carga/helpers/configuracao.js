// Configuração compartilhada dos testes de carga (k6). Tudo vem de variáveis -e/ambiente:
//   BASE_URL  API alvo, com o prefixo (default: API de dev em http://localhost:8000/apiparcelas)
//   PERFIL    fumaca | carga | estresse | pico (default: fumaca)
//   K6_EMAIL / K6_SENHA  usuário usado nos testes autenticados
// Nunca aponte para produção.

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/apiparcelas';

/** Quantos usuários virtuais (VUs) e por quanto tempo, por tipo de teste. */
const PERFIS = {
  // 1 usuário, poucas requisições: confirma que o script e a API funcionam antes de testar de verdade
  fumaca: { vus: 1, iterations: 10 },
  // uso normal esperado: sobe até 20 usuários, mantém e desce
  carga: {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
  },
  // acima do normal, em degraus: descobre onde a API começa a degradar
  estresse: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 0 },
    ],
  },
  // salto repentino de usuários: a API aguenta e se recupera?
  pico: {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '20s', target: 300 },
      { duration: '1m', target: 300 },
      { duration: '20s', target: 5 },
      { duration: '10s', target: 0 },
    ],
  },
};

/**
 * Opções do k6 para o PERFIL escolhido + limites (thresholds) de aprovação.
 * Se um limite estourar, o k6 termina com código de saída diferente de 0 (útil em CI).
 */
export function montarOpcoes({ p95Ms = 500 } = {}) {
  const nome = __ENV.PERFIL || 'fumaca';
  const perfil = PERFIS[nome];
  if (!perfil) {
    throw new Error(`PERFIL inválido: ${nome}. Use: ${Object.keys(PERFIS).join(', ')}`);
  }

  return {
    ...perfil,
    thresholds: {
      http_req_failed: ['rate<0.01'], // menos de 1% de erro
      http_req_duration: [`p(95)<${p95Ms}`], // 95% das respostas abaixo de p95Ms
      checks: ['rate>0.99'], // 99% dos check() passando
    },
  };
}

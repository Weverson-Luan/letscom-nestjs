// Carga em GET /testar_conexao: rota pública que consulta o MySQL.
// Mede a base da API (Nest + Prisma + banco) sem autenticação nem regra de negócio.
//   npm run carga:conexao
//   npm run carga:conexao -- -e PERFIL=carga
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';

export const options = montarOpcoes({ p95Ms: 300 });

export default function () {
  const resposta = http.get(`${BASE_URL}/testar_conexao`);

  check(resposta, {
    'status 200': (r) => r.status === 200,
    'conectado ao banco': (r) => r.json('message') === '200 OK - Conectado ao banco de dados!',
  });

  sleep(1); // "tempo de leitura" de um usuário real entre uma ação e outra
}

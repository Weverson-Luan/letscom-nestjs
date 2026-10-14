import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppE2e, PREFIXO_API } from '../helpers/criar-app-e2e';

describe('GET /testar_conexao (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await criarAppE2e();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 sem token quando o banco está acessível', async () => {
    const resposta = await request(app.getHttpServer()).get(`${PREFIXO_API}/testar_conexao`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ message: '200 OK - Conectado ao banco de dados!' });
  });
});

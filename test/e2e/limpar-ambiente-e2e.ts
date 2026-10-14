import '../jest.setup';
import { createConnection } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { limparBanco } from './helpers/limpar-banco';

/**
 * globalSetup e globalTeardown do e2e: esvazia o banco (mantém estrutura e _prisma_migrations)
 * e o Redis de teste antes e depois da suíte. Quem sobe e para os containers é o pretest/posttest:e2e.
 */
export default async function limparAmbienteE2e(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await limparBanco(prisma);
  } finally {
    await prisma.$disconnect();
  }
  await limparRedis();
}

/** FLUSHDB via protocolo RESP, sem depender de client Redis só para isso. */
function limparRedis(): Promise<void> {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } = process.env;
  const comandos = [
    ...(REDIS_PASSWORD ? [['AUTH', REDIS_PASSWORD]] : []),
    ['SELECT', REDIS_DB ?? '0'],
    ['FLUSHDB'],
  ];
  const payload = comandos
    .map((args) => `*${args.length}\r\n${args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('')}`)
    .join('');

  return new Promise((resolver, rejeitar) => {
    let concluido = false;
    const concluir = (erro?: Error) => {
      if (concluido) return;
      concluido = true;
      socket.destroy();
      if (erro) rejeitar(erro);
      else resolver();
    };

    const socket = createConnection(Number(REDIS_PORT), REDIS_HOST, () => socket.write(payload));
    // porta errada (ex.: outro serviço que não responde RESP) não pode travar o globalSetup
    socket.setTimeout(5000, () => concluir(new Error(`limparRedis: sem resposta de ${REDIS_HOST}:${REDIS_PORT}`)));

    let resposta = '';
    socket.on('data', (parte) => {
      resposta += parte.toString();
      // só linhas completas (terminadas em \r\n); cada comando aqui responde uma linha (+OK / -ERR)
      const linhas = resposta.split('\r\n').slice(0, -1);
      if (linhas.length < comandos.length) return;
      const erro = linhas.find((linha) => linha.startsWith('-'));
      concluir(erro ? new Error(`limparRedis falhou: ${erro}`) : undefined);
    });
    socket.on('error', (erro) => concluir(erro));
    socket.on('close', () => concluir(new Error('limparRedis: conexão fechada antes da resposta completa')));
  });
}

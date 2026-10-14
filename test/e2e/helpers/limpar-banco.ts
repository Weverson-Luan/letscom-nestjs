import { PrismaClient } from '@prisma/client';

/**
 * Esvazia todas as tabelas do banco de teste (mantém _prisma_migrations).
 * Use no beforeEach/afterAll de suítes que precisam começar do zero.
 *
 * Trava de segurança: só executa se o DATABASE_URL apontar para um banco terminado em `_test`.
 */
export async function limparBanco(prisma: PrismaClient): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!/\/[^/?]+_test(\?|$)/.test(url)) {
    throw new Error(`limparBanco recusado: DATABASE_URL não é um banco de teste (${url})`);
  }

  const tabelas = await prisma.$queryRaw<Array<{ nome: string }>>`
    SELECT TABLE_NAME AS nome
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME <> '_prisma_migrations'
  `;

  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0'),
    ...tabelas.map(({ nome }) => prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${nome}\``)),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'),
  ]);
}

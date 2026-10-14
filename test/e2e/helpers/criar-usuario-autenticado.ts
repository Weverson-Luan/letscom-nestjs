import { INestApplication } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { JwtTokenService } from 'src/modules/auth/services/jwt-token.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';

let sequencia = 0;

/** Busca o papel pelo nome (coluna roles.nome) ou cria, se o banco de teste ainda não tiver. */
export function buscarOuCriarPapel(prisma: PrismaService, nome: string): Promise<Role> {
  return prisma.role.upsert({ where: { nome }, update: {}, create: { nome } });
}

/**
 * Cria um usuário interno (tabela users) com o papel informado e devolve um access token
 * válido para ele, assinado pelo próprio JwtTokenService da aplicação.
 * Sem `papel`, o usuário fica sem role (útil para testar 403).
 */
export async function criarUsuarioAutenticado(
  app: INestApplication,
  papel?: string,
): Promise<{ usuario: User; token: string }> {
  const prisma = app.get(PrismaService);
  sequencia += 1;

  const usuario = await prisma.user.create({
    data: {
      nome: `Usuario e2e ${sequencia}`,
      email: `usuario${sequencia}@e2e.test`,
      senha: 'nao-usada-no-e2e',
      telefone: `1190000${String(sequencia).padStart(4, '0')}`,
      tipoPessoa: 'F',
    },
  });

  if (papel) {
    const role = await buscarOuCriarPapel(prisma, papel);
    await prisma.$executeRaw`
      INSERT INTO role_user (user_id, role_id, ativo) VALUES (${usuario.id}, ${role.id}, true)
    `;
  }

  const token = app.get(JwtTokenService, { strict: false }).createToken({
    sub: usuario.id,
    tipo_login: 'user',
    email: usuario.email,
  });

  return { usuario, token };
}

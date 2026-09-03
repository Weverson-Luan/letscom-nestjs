/**
 * IMPORTS
 */

import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Acesso à pivot `role_user` do Laravel (sem coluna `id`).
 * Usado quando o banco veio de dump de produção, sem rodar migrations Nest.
 */
@Injectable()
export class RoleUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encontra o papel primário de um usuário
   * @param userId - O ID do usuário
   * @returns O papel primário
   */
  async findPrimaryRoleForUser(userId: bigint): Promise<Role | null> {
    const rows = await this.prisma.$queryRaw<Role[]>`
      SELECT r.id, r.nome, r.descricao, r.created_at AS createdAt, r.updated_at AS updatedAt
      FROM roles r
      INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.user_id = ${userId} AND ru.ativo = 1
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  /**
   * Encontra o papel primário de um usuário cliente
   * @param clientSubId - O ID do cliente
   * @returns O papel primário
   */
  async findPrimaryRoleForUserCliente(clientSubId: bigint): Promise<Role | null> {
    const rows = await this.prisma.$queryRaw<Role[]>`
      SELECT r.id, r.nome, r.descricao, r.created_at AS createdAt, r.updated_at AS updatedAt
      FROM roles r
      INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.client_sub_id = ${clientSubId} AND ru.ativo = 1
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  /**
   * Encontra os nomes dos papéis de um usuário
   * @param userId - O ID do usuário
   * @returns Os nomes dos papéis
   */
  async findRoleNamesForUser(userId: bigint): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ nome: string }[]>`
      SELECT r.nome
      FROM roles r
      INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.user_id = ${userId} AND ru.ativo = 1
    `;
    return rows.map((row) => row.nome.toLowerCase());
  }

  /**
   * Encontra os nomes dos papéis de um usuário cliente
   * @param clientSubId - O ID do cliente
   * @returns Os nomes dos papéis
   */
  async findRoleNamesForUserCliente(clientSubId: bigint): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ nome: string }[]>`
      SELECT r.nome
      FROM roles r
      INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.client_sub_id = ${clientSubId} AND ru.ativo = 1
    `;
    return rows.map((row) => row.nome.toLowerCase());
  }

  /**
   * Atribui um papel a um usuário
   * @param db - O cliente do Prisma
   * @param userId - O ID do usuário
   * @param roleId - O ID do papel
   * @param ativo - Se o papel está ativo
   */
  attachToUser(
    db: DbClient,
    userId: bigint,
    roleId: bigint,
    ativo = true,
  ) {
    return db.$executeRaw`
      INSERT INTO role_user (user_id, role_id, ativo)
      VALUES (${userId}, ${roleId}, ${ativo})
    `;
  }

  /**
   * Atribui um papel a um usuário cliente
   * @param db - O cliente do Prisma
   * @param clientSubId - O ID do cliente
   * @param roleId - O ID do papel
   * @param ativo - Se o papel está ativo
   */
  attachToUserCliente(
    db: DbClient,
    clientSubId: bigint,
    roleId: bigint,
    ativo = true,
  ) {
    return db.$executeRaw`
      INSERT INTO role_user (client_sub_id, role_id, ativo)
      VALUES (${clientSubId}, ${roleId}, ${ativo})
    `;
  }

  /**
   * Conta o número de usuários com um papel
   * @param roleName - O nome do papel
   * @param onlyActiveUsers - Se apenas usuários ativos devem ser contados
   * @returns O número de usuários com um papel
   */
  countUsersWithRole(roleName: string, onlyActiveUsers = true) {
    return this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE LOWER(r.nome) = LOWER(${roleName})
        AND u.deleted_at IS NULL
        ${onlyActiveUsers ? Prisma.sql`AND u.ativo = 1` : Prisma.empty}
    `.then((rows) => Number(rows[0]?.total ?? 0));
  }

  /**
   * Encontra os IDs dos usuários clientes recentes
   * @param limit - O limite de usuários a serem encontrados
   * @returns Os IDs dos usuários clientes recentes
   */
  async findRecentClientUserIds(limit: number): Promise<bigint[]> {
    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT u.id
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE LOWER(r.nome) = 'cliente'
        AND u.ativo = 1
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }
}

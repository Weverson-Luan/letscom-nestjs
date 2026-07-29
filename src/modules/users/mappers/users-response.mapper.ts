import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { serializeUser } from 'src/modules/auth/mappers/auth-response.mapper';

/**
 * Espelha o UsersResponseHelper::mapUsersList: enriquece cada usuário da
 * listagem com consultor, contato (1º subordinado), produto, endereço,
 * tipo_entrega e o saldo de créditos agregado (vendas confirmadas).
 */
@Injectable()
export class UsersResponseMapper {
  constructor(private readonly prisma: PrismaService) {}

  async mapUsersList(users: any[]): Promise<any[]> {
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    const creditosPorCliente = await this.agregarCreditos(userIds);
    const contatosPorCliente = await this.buscarContatos(userIds);

    return users.map((user) => {
      const creditos = creditosPorCliente[user.id.toString()] ?? {
        entradas: 0,
        saidas: 0,
      };

      return {
        ...serializeUser(user),
        consultor: serializeUser(user.clienteConsultores?.[0]?.consultor ?? null),
        contato: serializeUser(contatosPorCliente[user.id.toString()] ?? null),
        designer: null,
        produto: user.produtosVinculados?.[0]?.produto ?? null,
        enderecos: user.enderecos?.[0] ?? null,
        tipo_entrega: user.tiposEntregaUser?.[0] ?? null,
        creditos: {
          saldo: creditos.entradas - creditos.saidas,
          entradas: creditos.entradas,
          saidas: creditos.saidas,
        },
        clienteConsultores: undefined,
        produtosVinculados: undefined,
        tiposEntregaUser: undefined,
        rolePivots: undefined,
      };
    });
  }

  private async agregarCreditos(
    userIds: bigint[],
  ): Promise<Record<string, { entradas: number; saidas: number }>> {
    const linhas = await this.prisma.creditSale.groupBy({
      by: ['clienteId', 'tipoTransacao'],
      where: { clienteId: { in: userIds }, status: 'confirmado' },
      _sum: { quantidadeCreditos: true },
    });

    const result: Record<string, { entradas: number; saidas: number }> = {};
    for (const linha of linhas) {
      const key = linha.clienteId.toString();
      if (!result[key]) result[key] = { entradas: 0, saidas: 0 };
      const total = Number(linha._sum.quantidadeCreditos ?? 0);
      if (linha.tipoTransacao === 'entrada') {
        result[key].entradas += total;
      } else {
        result[key].saidas += total;
      }
    }
    return result;
  }

  private async buscarContatos(userIds: bigint[]): Promise<Record<string, any>> {
    // 1 contato por cliente (o mais antigo, MIN(id))
    const grupos = await this.prisma.userCliente.groupBy({
      by: ['clienteId'],
      where: { clienteId: { in: userIds } },
      _min: { id: true },
    });
    const contatoIds = grupos.map((g) => g._min.id!).filter(Boolean);

    const contatos = await this.prisma.userCliente.findMany({
      where: { id: { in: contatoIds } },
    });

    const map: Record<string, any> = {};
    for (const contato of contatos) {
      map[contato.clienteId.toString()] = contato;
    }
    return map;
  }

  /** Espelha o jsonSingleUser: usuário + tipo_entrega (1º). */
  mapSingleUser(user: any): any {
    const tipoEntrega = user.tiposEntregaUser?.[0]?.tipoEntrega ?? null;
    const { tiposEntregaUser: _t, ...rest } = user;
    return { ...serializeUser(rest), tipo_entrega: tipoEntrega };
  }
}

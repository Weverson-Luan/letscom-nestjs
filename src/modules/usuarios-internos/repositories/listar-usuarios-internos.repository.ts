/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// constants
import { PapelInterno } from '../usuarios-internos.constants';

// helpers (filtro de usuário interno)
import {
  combinarUsuariosComPapel,
  LinhaUsuarioInterno,
  montarFiltroUsuarioInterno,
} from './helpers/filtro-usuario-interno.helper';

type ParametrosPaginacao = { search?: string; papel?: PapelInterno; skip: number; take: number };

@Injectable()
export class ListarUsuariosInternosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginar(parametros: ParametrosPaginacao) {
    const filtro = montarFiltroUsuarioInterno(parametros);

    const [linhas, contagem] = await Promise.all([
      this.prisma.$queryRaw<LinhaUsuarioInterno[]>`
        SELECT u.id, MIN(LOWER(r.nome)) AS papel
        ${filtro}
        GROUP BY u.id, u.created_at
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT ${parametros.take} OFFSET ${parametros.skip}
      `,
      this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(DISTINCT u.id) AS total
        ${filtro}
      `,
    ]);

    const usuarios =
      linhas.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: linhas.map((linha) => linha.id) } },
          });

    return {
      data: combinarUsuariosComPapel(linhas, usuarios),
      total: Number(contagem[0]?.total ?? 0),
    };
  }
}

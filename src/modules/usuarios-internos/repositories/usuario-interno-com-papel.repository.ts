/**
 * IMPORTS
 */
import { Injectable } from '@nestjs/common';

// shared
import { PrismaService } from 'src/shared/prisma/prisma.service';

// helpers (filtro de usuário interno)
import {
  combinarUsuariosComPapel,
  LinhaUsuarioInterno,
  montarFiltroUsuarioInterno,
  UsuarioInternoComPapel,
} from './helpers/filtro-usuario-interno.helper';

@Injectable()
export class UsuarioInternoComPapelRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** null quando inexistente, excluído ou não é usuário interno. */
  async buscarPorId(id: bigint): Promise<UsuarioInternoComPapel | null> {
    const linhas = await this.prisma.$queryRaw<LinhaUsuarioInterno[]>`
      SELECT u.id, MIN(LOWER(r.nome)) AS papel
      ${montarFiltroUsuarioInterno({ id })}
      GROUP BY u.id
    `;
    if (linhas.length === 0) return null;

    const usuario = await this.prisma.user.findUnique({ where: { id } });
    const [encontrado] = combinarUsuariosComPapel(linhas, usuario ? [usuario] : []);
    return encontrado ?? null;
  }
}

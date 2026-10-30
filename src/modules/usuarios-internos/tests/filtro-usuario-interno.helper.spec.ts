/**
 * IMPORTS
 */

// helpers (filtro de usuário interno)
import {
  combinarUsuariosComPapel,
  montarFiltroUsuarioInterno,
} from '../repositories/helpers/filtro-usuario-interno.helper';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('montarFiltroUsuarioInterno', () => {
  it('só considera papéis internos e exclui quem tem outro papel ativo', () => {
    const sql = montarFiltroUsuarioInterno({});

    expect(sql.sql).toContain('u.deleted_at IS NULL');
    expect(sql.sql).toContain('LOWER(r.nome) IN (?,?,?)');
    expect(sql.sql).toContain('NOT EXISTS');
    expect(sql.sql).toContain('LOWER(r2.nome) NOT IN (?,?,?)');
    expect(sql.values).toEqual([
      'consultor',
      'producao',
      'recepcao',
      'consultor',
      'producao',
      'recepcao',
    ]);
    expect(sql.sql).not.toContain('u.id = ?');
    expect(sql.sql).not.toContain('LIKE');
  });

  it('aplica id, papel e busca quando informados', () => {
    const sql = montarFiltroUsuarioInterno({ id: 12n, papel: 'recepcao', search: 'maria' });

    expect(sql.sql).toContain('AND u.id = ?');
    expect(sql.sql).toContain('AND LOWER(r.nome) = ?');
    expect(sql.sql).toContain('u.email LIKE ?');
    expect(sql.sql).toContain('u.documento LIKE ?');
    expect(sql.values).toEqual(expect.arrayContaining([12n, 'recepcao', '%maria%']));
  });
});

describe('combinarUsuariosComPapel', () => {
  it('mantém a ordem das linhas, normaliza o papel e descarta id sem usuário', () => {
    const primeiro = criarUsuarioFake({ id: 1n });
    const segundo = criarUsuarioFake({ id: 2n });

    const resultado = combinarUsuariosComPapel(
      [
        { id: 2n, papel: 'PRODUCAO' },
        { id: 1n, papel: 'consultor' },
        { id: 3n, papel: 'recepcao' },
      ],
      [primeiro, segundo],
    );

    expect(resultado).toEqual([
      { usuario: segundo, papel: 'producao' },
      { usuario: primeiro, papel: 'consultor' },
    ]);
  });
});

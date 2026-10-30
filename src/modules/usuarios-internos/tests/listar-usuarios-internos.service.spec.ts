/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// repositories
import { ListarUsuariosInternosRepository } from '../repositories/listar-usuarios-internos.repository';

// services
import { ListarUsuariosInternosService } from '../services/listar-usuarios-internos.service';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('ListarUsuariosInternosService', () => {
  const repository = { paginar: jest.fn() };
  let service: ListarUsuariosInternosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarUsuariosInternosService,
        { provide: ListarUsuariosInternosRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarUsuariosInternosService);
    repository.paginar.mockResolvedValue({
      data: [{ usuario: criarUsuarioFake(), papel: 'consultor' }],
      total: 21,
    });
  });

  it('pagina, filtra e mapeia os usuários internos', async () => {
    const resultado = await service.execute({
      page: '2',
      per_page: '10',
      search: '  maria ',
      papel: 'consultor',
    });

    expect(repository.paginar).toHaveBeenCalledWith({
      search: 'maria',
      papel: 'consultor',
      skip: 10,
      take: 10,
    });
    expect(resultado.data).toEqual([expect.objectContaining({ id: 12n, papel: 'consultor' })]);
    expect(resultado.pagination).toEqual({
      current_page: 2,
      last_page: 3,
      per_page: 10,
      total: 21,
    });
  });

  it('ignora busca em branco e usa 10 por página por padrão', async () => {
    await service.execute({ search: '   ' });

    expect(repository.paginar).toHaveBeenCalledWith({
      search: undefined,
      papel: undefined,
      skip: 0,
      take: 10,
    });
  });

  it('limita a 100 itens por página', async () => {
    await service.execute({ per_page: '500' });

    expect(repository.paginar).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });
});

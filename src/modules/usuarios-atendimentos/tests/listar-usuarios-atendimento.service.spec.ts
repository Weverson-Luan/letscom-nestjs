/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// repositories
import { ListarUsuariosAtendimentoRepository } from '../repositories/listar-usuarios-atendimento.repository';

// services
import { ListarUsuariosAtendimentoService } from '../services/listar-usuarios-atendimento.service';

describe('ListarUsuariosAtendimentoService', () => {
  let service: ListarUsuariosAtendimentoService;
  const repository = { listarComUsuario: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarUsuariosAtendimentoService,
        { provide: ListarUsuariosAtendimentoRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ListarUsuariosAtendimentoService);
  });

  it('lista os usuários de atendimento no formato do Laravel', async () => {
    repository.listarComUsuario.mockResolvedValue([
      { id: 1n, userId: 7n, email: 'a@a.com', user: { id: 7n, nome: 'Cliente', email: 'c@c.com' } },
    ]);

    const resultado = await service.execute();

    expect(resultado).toEqual([
      expect.objectContaining({
        id: 1n,
        user_id: 7n,
        email: 'a@a.com',
        user: { id: 7n, nome: 'Cliente', email: 'c@c.com' },
      }),
    ]);
  });

  it('retorna lista vazia quando não há usuários de atendimento', async () => {
    repository.listarComUsuario.mockResolvedValue([]);

    await expect(service.execute()).resolves.toEqual([]);
  });
});

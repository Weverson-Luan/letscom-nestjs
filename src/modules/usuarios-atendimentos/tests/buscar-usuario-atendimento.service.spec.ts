/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

// repositories
import { BuscarUsuarioAtendimentoRepository } from '../repositories/buscar-usuario-atendimento.repository';

// services
import { BuscarUsuarioAtendimentoService } from '../services/buscar-usuario-atendimento.service';

describe('BuscarUsuarioAtendimentoService', () => {
  let service: BuscarUsuarioAtendimentoService;
  const repository = { buscarPorIdComUsuario: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarUsuarioAtendimentoService,
        { provide: BuscarUsuarioAtendimentoRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(BuscarUsuarioAtendimentoService);
  });

  it('retorna o usuário de atendimento mapeado', async () => {
    repository.buscarPorIdComUsuario.mockResolvedValue({ id: 3n, userId: 7n, user: null });

    await expect(service.execute(3n)).resolves.toEqual(
      expect.objectContaining({ id: 3n, user_id: 7n, user: undefined }),
    );
    expect(repository.buscarPorIdComUsuario).toHaveBeenCalledWith(3n);
  });

  it('lança 404 quando não existe', async () => {
    repository.buscarPorIdComUsuario.mockResolvedValue(null);

    await expect(service.execute(3n)).rejects.toThrow(UsuarioAtendimentoNaoEncontradoException);
  });
});

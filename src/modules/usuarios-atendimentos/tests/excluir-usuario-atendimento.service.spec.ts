/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

// repositories
import { ExcluirUsuarioAtendimentoRepository } from '../repositories/excluir-usuario-atendimento.repository';

// services
import { ExcluirUsuarioAtendimentoService } from '../services/excluir-usuario-atendimento.service';

describe('ExcluirUsuarioAtendimentoService', () => {
  let service: ExcluirUsuarioAtendimentoService;
  const repository = { buscarPorId: jest.fn(), excluir: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExcluirUsuarioAtendimentoService,
        { provide: ExcluirUsuarioAtendimentoRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ExcluirUsuarioAtendimentoService);
  });

  it('exclui o usuário de atendimento existente', async () => {
    repository.buscarPorId.mockResolvedValue({ id: 4n });

    await service.execute(4n);

    expect(repository.excluir).toHaveBeenCalledWith(4n);
  });

  it('lança 404 quando não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(4n)).rejects.toThrow(UsuarioAtendimentoNaoEncontradoException);
    expect(repository.excluir).not.toHaveBeenCalled();
  });
});

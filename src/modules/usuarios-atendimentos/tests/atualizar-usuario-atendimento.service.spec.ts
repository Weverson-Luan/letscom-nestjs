/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';

// repositories
import { AtualizarUsuarioAtendimentoRepository } from '../repositories/atualizar-usuario-atendimento.repository';

// services
import { AtualizarUsuarioAtendimentoService } from '../services/atualizar-usuario-atendimento.service';

describe('AtualizarUsuarioAtendimentoService', () => {
  let service: AtualizarUsuarioAtendimentoService;
  const repository = { buscarPorId: jest.fn(), atualizar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.buscarPorId.mockResolvedValue({ id: 4n });
    repository.atualizar.mockResolvedValue({ id: 4n, userId: 7n, nome: 'Novo' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarUsuarioAtendimentoService,
        { provide: AtualizarUsuarioAtendimentoRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(AtualizarUsuarioAtendimentoService);
  });

  it('atualiza só os campos enviados e devolve mapeado', async () => {
    const resultado = await service.execute(4n, { nome: 'Novo', ativo: false });

    expect(repository.atualizar).toHaveBeenCalledWith(4n, { nome: 'Novo', ativo: false });
    expect(resultado).toEqual(expect.objectContaining({ id: 4n, user_id: 7n, nome: 'Novo' }));
  });

  it('envia todos os campos quando informados', async () => {
    await service.execute(4n, {
      nome: 'N',
      email: 'e@e.com',
      telefone: '11',
      documento: '123',
      ativo: true,
    });

    expect(repository.atualizar).toHaveBeenCalledWith(4n, {
      nome: 'N',
      email: 'e@e.com',
      telefone: '11',
      documento: '123',
      ativo: true,
    });
  });

  it('lança 404 quando não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(4n, { nome: 'X' })).rejects.toThrow(
      UsuarioAtendimentoNaoEncontradoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });
});

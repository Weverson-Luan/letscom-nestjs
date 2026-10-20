import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ConversaClienteResumoRepository } from '../repositories/conversa-cliente-resumo.repository';
import { BuscarConversaClienteService } from '../services/buscar-conversa-cliente.service';
import { criarLinhaResumoFake } from './fixtures';

describe('BuscarConversaClienteService', () => {
  const repository = { buscarPorId: jest.fn() };
  let service: BuscarConversaClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarConversaClienteService,
        { provide: ConversaClienteResumoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(BuscarConversaClienteService);
  });

  it('devolve o resumo do cliente', async () => {
    repository.buscarPorId.mockResolvedValue(criarLinhaResumoFake());

    await expect(service.execute(5n)).resolves.toMatchObject({ id: 5n, nome: 'Empresa X' });
    expect(repository.buscarPorId).toHaveBeenCalledWith(5n);
  });

  it('lança 404 quando não é cliente ativo', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n)).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
  });
});

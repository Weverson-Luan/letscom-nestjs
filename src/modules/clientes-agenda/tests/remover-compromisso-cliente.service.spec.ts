import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { CompromissoNaoEncontradoException } from '../exceptions/compromisso-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { RemoverCompromissoClienteService } from '../services/remover-compromisso-cliente.service';
import { criarCompromissoFake } from './fixtures';

describe('RemoverCompromissoClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn(), buscarPorId: jest.fn(), remover: jest.fn() };
  let service: RemoverCompromissoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemoverCompromissoClienteService,
        { provide: ClienteCompromissoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(RemoverCompromissoClienteService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.buscarPorId.mockResolvedValue(criarCompromissoFake());
  });

  it('exclui logicamente o compromisso do cliente', async () => {
    await expect(service.execute(5n, 1n)).resolves.toBeUndefined();

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 1n);
    expect(repository.remover).toHaveBeenCalledWith(1n);
  });

  it('lança 404 quando o cliente não está ativo', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, 1n)).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.remover).not.toHaveBeenCalled();
  });

  it('lança 404 quando o compromisso não existe, é de outro cliente ou já foi excluído', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 1n)).rejects.toBeInstanceOf(CompromissoNaoEncontradoException);
    expect(repository.remover).not.toHaveBeenCalled();
  });
});

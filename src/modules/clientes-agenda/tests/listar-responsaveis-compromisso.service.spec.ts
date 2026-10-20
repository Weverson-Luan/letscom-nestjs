import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';
import { ListarResponsaveisCompromissoService } from '../services/listar-responsaveis-compromisso.service';

describe('ListarResponsaveisCompromissoService', () => {
  const compromissoRepository = { ehClienteAtivo: jest.fn() };
  const repository = { paginar: jest.fn() };
  let service: ListarResponsaveisCompromissoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarResponsaveisCompromissoService,
        { provide: ClienteCompromissoRepository, useValue: compromissoRepository },
        { provide: ResponsavelCompromissoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarResponsaveisCompromissoService);
    compromissoRepository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({
      data: [
        {
          tipo: 'interno',
          id: 8n,
          nome: 'Consultor',
          email: 'consultor@letscom.com',
          documento: null,
        },
      ],
      total: 41,
    });
  });

  it('pagina com busca aparada e devolve a paginação', async () => {
    const resultado = await service.execute(5n, { search: '  cons ', page: '2' });

    expect(compromissoRepository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      search: 'cons',
      skip: 20,
      take: 20,
    });
    expect(resultado).toEqual({
      data: [
        {
          tipo: 'interno',
          id: 8n,
          nome: 'Consultor',
          email: 'consultor@letscom.com',
          documento: null,
        },
      ],
      pagination: { current_page: 2, last_page: 3, per_page: 20, total: 41 },
    });
  });

  it('limita per_page a 50', async () => {
    await service.execute(5n, { per_page: '500' });

    expect(repository.paginar).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 50 }));
  });

  it.each([undefined, '   '])('sem busca efetiva (%s) não filtra', async (search) => {
    await service.execute(5n, { search });

    expect(repository.paginar).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }));
  });

  it('lança 404 quando o cliente não está ativo, sem listar', async () => {
    compromissoRepository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, {})).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.paginar).not.toHaveBeenCalled();
  });
});

import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ListarMinhaAgendaService } from '../services/listar-minha-agenda.service';
import { criarCompromissoFake, criarUsuarioLogadoFake } from './fixtures';

describe('ListarMinhaAgendaService', () => {
  const repository = { ehClienteAtivo: jest.fn(), paginar: jest.fn() };
  let service: ListarMinhaAgendaService;
  const subordinado = criarUsuarioLogadoFake({
    id: 3n,
    tipoLogin: 'subordinado',
    clienteId: 5n,
    roles: ['subordinado'],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarMinhaAgendaService,
        { provide: ClienteCompromissoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarMinhaAgendaService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({ data: [criarCompromissoFake()], total: 1 });
  });

  it('lista só os visíveis da empresa do subordinado, sem autor e visivel_cliente', async () => {
    const resultado = await service.execute({ status: 'pendente' }, subordinado);

    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      somenteVisiveisCliente: true,
      status: 'pendente',
      tipo: undefined,
      de: undefined,
      ate: undefined,
      search: undefined,
      skip: 0,
      take: 20,
    });
    expect(resultado.data[0]).not.toHaveProperty('autor');
    expect(resultado.data[0]).not.toHaveProperty('visivel_cliente');
    expect(resultado.data[0]).toEqual(
      expect.objectContaining({
        id: 1n,
        responsavel: { tipo: 'interno', id: 8n, nome: 'Consultor' },
      }),
    );
    expect(resultado.pagination).toEqual({ current_page: 1, last_page: 1, per_page: 20, total: 1 });
  });

  it('cliente principal usa o próprio id como empresa', async () => {
    await service.execute({}, criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] }));

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(repository.paginar).toHaveBeenCalledWith(expect.objectContaining({ clienteId: 5n }));
  });

  it('lança 404 para subordinado sem empresa, sem consultar o banco', async () => {
    await expect(
      service.execute({}, criarUsuarioLogadoFake({ tipoLogin: 'subordinado', clienteId: null })),
    ).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.ehClienteAtivo).not.toHaveBeenCalled();
  });

  it('lança 404 quando a empresa não está ativa, sem paginar', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute({}, subordinado)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(repository.paginar).not.toHaveBeenCalled();
  });
});

import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ListarMinhasAnotacoesService } from '../services/listar-minhas-anotacoes.service';
import { criarAnotacaoFake, criarUsuarioLogadoFake } from './fixtures';

describe('ListarMinhasAnotacoesService', () => {
  const repository = { ehClienteAtivo: jest.fn(), paginar: jest.fn() };
  let service: ListarMinhasAnotacoesService;
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
        ListarMinhasAnotacoesService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ListarMinhasAnotacoesService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({ data: [criarAnotacaoFake()], total: 1 });
  });

  it('lista a conversa da empresa do usuário, sem permissões de edição', async () => {
    const resultado = await service.execute({ tipo: 'email', search: ' prazo ' }, subordinado);

    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      tipo: 'email',
      search: 'prazo',
      skip: 0,
      take: 20,
    });
    expect(resultado.data).toEqual([
      expect.objectContaining({ eh_minha: false, pode_editar: false, pode_excluir: false }),
    ]);
    expect(resultado.pagination).toEqual({ current_page: 1, last_page: 1, per_page: 20, total: 1 });
  });

  it('cliente principal usa o próprio id como empresa', async () => {
    await service.execute({}, criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] }));

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
  });

  it('lança 404 quando a empresa não está ativa', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute({}, subordinado)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(repository.paginar).not.toHaveBeenCalled();
  });
});

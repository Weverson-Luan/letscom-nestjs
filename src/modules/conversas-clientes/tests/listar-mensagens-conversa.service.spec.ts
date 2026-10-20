import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { ListarMensagensConversaService } from '../services/listar-mensagens-conversa.service';
import { criarMensagemFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('ListarMensagensConversaService', () => {
  const repository = { ehClienteAtivo: jest.fn(), paginar: jest.fn() };
  const usuario = criarUsuarioLogadoFake({ id: 99n });
  const acesso = { garantirAcesso: jest.fn() };
  let service: ListarMensagensConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarMensagensConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
      ],
    }).compile();
    service = moduleRef.get(ListarMensagensConversaService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({ data: [criarMensagemFake()], total: 45 });
  });

  it('pagina, filtra e mapeia com permissões do usuário logado', async () => {
    const resultado = await service.execute(
      5n,
      { page: '2', per_page: '20', search: '  orçamento ' },
      usuario,
    );

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      search: 'orçamento',
      visivelDesde: null,
      skip: 20,
      take: 20,
    });
    expect(resultado.data).toEqual([
      expect.objectContaining({ id: 30n, pode_editar: false, pode_excluir: false }),
    ]);
    expect(resultado.pagination).toEqual({
      current_page: 2,
      last_page: 3,
      per_page: 20,
      total: 45,
    });
  });

  it('usa 20 por página por padrão, limita a 50 e ignora busca em branco', async () => {
    await service.execute(5n, { search: '  ' }, usuario);
    expect(repository.paginar).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined, skip: 0, take: 20 }),
    );

    await service.execute(5n, { per_page: '500' }, usuario);
    expect(repository.paginar).toHaveBeenLastCalledWith(expect.objectContaining({ take: 50 }));
  });

  it('devolve lista vazia com paginação mínima', async () => {
    repository.paginar.mockResolvedValue({ data: [], total: 0 });

    const resultado = await service.execute(5n, {}, usuario);

    expect(resultado).toEqual({
      data: [],
      pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    });
  });

  it('lança 404 quando o cliente não existe', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, {}, usuario)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(repository.paginar).not.toHaveBeenCalled();
  });

  it('lança 403 para quem não participa da conversa, sem paginar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, {}, usuario)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(acesso.garantirAcesso).toHaveBeenCalledWith(5n, usuario);
    expect(repository.paginar).not.toHaveBeenCalled();
  });

  it('operador convidado só vê mensagens a partir de quando aceitou o convite', async () => {
    const aceitouEm = new Date('2026-10-15T09:00:00.000Z');
    acesso.garantirAcesso.mockResolvedValue({
      participante: criarParticipanteFake({ papel: 'convidado', respondidoEm: aceitouEm }),
      iniciada: true,
      semDonoInterno: false,
    });

    await service.execute(5n, {}, usuario);

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ visivelDesde: aceitouEm }),
    );
  });
});

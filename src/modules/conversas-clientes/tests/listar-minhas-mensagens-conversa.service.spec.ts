import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { ListarMinhasMensagensConversaService } from '../services/listar-minhas-mensagens-conversa.service';
import { criarMensagemFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('ListarMinhasMensagensConversaService', () => {
  const repository = { ehClienteAtivo: jest.fn(), paginar: jest.fn() };
  const acesso = { garantirAcesso: jest.fn() };
  let service: ListarMinhasMensagensConversaService;
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
        ListarMinhasMensagensConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
      ],
    }).compile();
    service = moduleRef.get(ListarMinhasMensagensConversaService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.paginar.mockResolvedValue({ data: [criarMensagemFake()], total: 1 });
  });

  it('lista a conversa da empresa do usuário, sem permissões de edição', async () => {
    const resultado = await service.execute({ search: ' prazo ' }, subordinado);

    expect(repository.paginar).toHaveBeenCalledWith({
      clienteId: 5n,
      search: 'prazo',
      visivelDesde: null,
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

  it('lança 403 para quem do lado do cliente não participa, sem paginar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute({}, subordinado)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(acesso.garantirAcesso).toHaveBeenCalledWith(5n, subordinado);
    expect(repository.paginar).not.toHaveBeenCalled();
  });

  it('convidado só vê mensagens a partir de quando aceitou o convite', async () => {
    const aceitouEm = new Date('2026-10-15T09:00:00.000Z');
    acesso.garantirAcesso.mockResolvedValue({
      participante: criarParticipanteFake({
        userId: null,
        subordinadoId: 3n,
        papel: 'convidado',
        respondidoEm: aceitouEm,
      }),
      iniciada: true,
      semDonoInterno: false,
    });

    await service.execute({}, subordinado);

    expect(repository.paginar).toHaveBeenCalledWith(
      expect.objectContaining({ visivelDesde: aceitouEm }),
    );
  });
});

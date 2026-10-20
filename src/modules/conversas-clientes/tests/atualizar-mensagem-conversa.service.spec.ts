import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { HttpStatus } from '@nestjs/common';
import { MensagemConversaInvalidaException } from '../exceptions/mensagem-conversa-invalida.exception';
import { MensagemConversaNaoEncontradaException } from '../exceptions/mensagem-conversa-nao-encontrada.exception';
import { SemPermissaoMensagemConversaException } from '../exceptions/sem-permissao-mensagem-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { AtualizarMensagemConversaService } from '../services/atualizar-mensagem-conversa.service';
import { criarAnexoFake, criarMensagemFake, criarUsuarioLogadoFake } from './fixtures';

describe('AtualizarMensagemConversaService', () => {
  const repository = { buscarPorId: jest.fn(), atualizar: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  const acesso = { garantirAcesso: jest.fn() };
  let service: AtualizarMensagemConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-16T10:00:00.000Z'));
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarMensagemConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
      ],
    }).compile();
    service = moduleRef.get(AtualizarMensagemConversaService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarPorId.mockResolvedValue(criarMensagemFake());
    repository.atualizar.mockResolvedValue(
      criarMensagemFake({ conteudo: 'Novo', editadaEm: new Date() }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it('atualiza o texto do autor e marca editada_em', async () => {
    const resultado = await service.execute(5n, 30n, { conteudo: ' Novo ' }, usuario);

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 30n);
    expect(repository.atualizar).toHaveBeenCalledWith(30n, {
      conteudo: 'Novo',
      editadaEm: new Date('2026-10-16T10:00:00.000Z'),
    });
    expect(resultado).toMatchObject({ conteudo: 'Novo', editada: true });
  });

  it('não grava nada quando o corpo vem vazio', async () => {
    const resultado = await service.execute(5n, 30n, {}, usuario);

    expect(repository.atualizar).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ id: 30n, editada: false });
  });

  it('permite apagar o texto quando a mensagem tem anexo', async () => {
    repository.buscarPorId.mockResolvedValue(criarMensagemFake({ anexos: [criarAnexoFake()] }));

    await service.execute(5n, 30n, { conteudo: '  ' }, usuario);

    expect(repository.atualizar).toHaveBeenCalledWith(
      30n,
      expect.objectContaining({ conteudo: '' }),
    );
  });

  it('recusa texto vazio quando não há anexo', async () => {
    await expect(service.execute(5n, 30n, { conteudo: '' }, usuario)).rejects.toBeInstanceOf(
      MensagemConversaInvalidaException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 404 quando a mensagem não existe para o cliente', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, { conteudo: 'x' }, usuario)).rejects.toBeInstanceOf(
      MensagemConversaNaoEncontradaException,
    );
  });

  it('lança 403 quando quem edita não é o autor, mesmo sendo admin', async () => {
    const admin = criarUsuarioLogadoFake({ id: 99n, roles: ['admin'] });

    const promessa = service.execute(5n, 30n, { conteudo: 'x' }, admin);

    await expect(promessa).rejects.toBeInstanceOf(SemPermissaoMensagemConversaException);
    await expect(promessa).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 403 para quem não participa da conversa, sem buscar a mensagem', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, 30n, { conteudo: 'x' }, usuario)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });
});

import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { NotificacaoEmissorService } from '../services/notificacao-emissor.service';

describe('NotificacaoEmissorService', () => {
  const repository = { criarVarias: jest.fn() };
  const tx = { marcador: 'tx' };
  let service: NotificacaoEmissorService;
  const dados = {
    tipo: 'mensagem_conversa' as const,
    titulo: 'Título',
    mensagem: 'Mensagem',
    link: '/clientes/5',
    conversaMensagemId: 30n,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificacaoEmissorService,
        { provide: NotificacaoRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(NotificacaoEmissorService);
  });

  it('grava uma linha por destinatário único, na transação recebida', async () => {
    const total = await service.emitir(
      [{ userId: 7n }, { userId: 7n }, { subordinadoId: 3n }],
      dados,
      tx as never,
    );

    expect(total).toBe(2);
    expect(repository.criarVarias).toHaveBeenCalledWith(
      [
        {
          destinatarioUserId: 7n,
          destinatarioSubordinadoId: null,
          tipo: 'mensagem_conversa',
          titulo: 'Título',
          mensagem: 'Mensagem',
          link: '/clientes/5',
          conversaMensagemId: 30n,
          participanteId: null,
        },
        {
          destinatarioUserId: null,
          destinatarioSubordinadoId: 3n,
          tipo: 'mensagem_conversa',
          titulo: 'Título',
          mensagem: 'Mensagem',
          link: '/clientes/5',
          conversaMensagemId: 30n,
          participanteId: null,
        },
      ],
      tx,
    );
  });

  it('grava o convite vinculado à notificação', async () => {
    await service.emitir([{ subordinadoId: 3n }], {
      tipo: 'convite_conversa',
      titulo: 'Convite para conversa',
      mensagem: 'Operador convidou você.',
      participanteId: 9n,
    });

    const [linha] = repository.criarVarias.mock.calls[0][0];
    expect(linha).toMatchObject({
      tipo: 'convite_conversa',
      participanteId: 9n,
      conversaMensagemId: null,
    });
  });

  it('não grava nada sem destinatários', async () => {
    await expect(service.emitir([], dados)).resolves.toBe(0);
    expect(repository.criarVarias).not.toHaveBeenCalled();
  });

  it('corta título acima de 191 e mensagem acima de 500 caracteres e usa null para link/mensagem ausentes', async () => {
    await service.emitir([{ userId: 7n }], {
      tipo: 'mensagem_conversa',
      titulo: 't'.repeat(250),
      mensagem: 'x'.repeat(600),
    });

    const [linha] = repository.criarVarias.mock.calls[0][0];
    expect(linha.mensagem).toHaveLength(500);
    expect(linha.mensagem.endsWith('\u2026')).toBe(true);
    expect(linha.titulo).toHaveLength(191);
    expect(linha).toMatchObject({ link: null, conversaMensagemId: null, participanteId: null });
  });
});

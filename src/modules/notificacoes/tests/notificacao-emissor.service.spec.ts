import { Test } from '@nestjs/testing';
import { NotificacaoRepository } from '../repositories/notificacao.repository';
import { NotificacaoEmissorService } from '../services/notificacao-emissor.service';

describe('NotificacaoEmissorService', () => {
  const repository = { criarVarias: jest.fn() };
  const tx = { marcador: 'tx' };
  let service: NotificacaoEmissorService;
  const dados = {
    tipo: 'anotacao_cliente' as const,
    titulo: 'Título',
    mensagem: 'Mensagem',
    link: '/clientes/5',
    anotacaoId: 30n,
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
          tipo: 'anotacao_cliente',
          titulo: 'Título',
          mensagem: 'Mensagem',
          link: '/clientes/5',
          anotacaoId: 30n,
        },
        {
          destinatarioUserId: null,
          destinatarioSubordinadoId: 3n,
          tipo: 'anotacao_cliente',
          titulo: 'Título',
          mensagem: 'Mensagem',
          link: '/clientes/5',
          anotacaoId: 30n,
        },
      ],
      tx,
    );
  });

  it('não grava nada sem destinatários', async () => {
    await expect(service.emitir([], dados)).resolves.toBe(0);
    expect(repository.criarVarias).not.toHaveBeenCalled();
  });

  it('corta título acima de 191 e mensagem acima de 500 caracteres e usa null para link/anotação ausentes', async () => {
    await service.emitir([{ userId: 7n }], {
      tipo: 'anotacao_cliente',
      titulo: 't'.repeat(250),
      mensagem: 'x'.repeat(600),
    });

    const [linha] = repository.criarVarias.mock.calls[0][0];
    expect(linha.mensagem).toHaveLength(500);
    expect(linha.mensagem.endsWith('\u2026')).toBe(true);
    expect(linha.titulo).toHaveLength(191);
    expect(linha).toMatchObject({ link: null, anotacaoId: null });
  });
});

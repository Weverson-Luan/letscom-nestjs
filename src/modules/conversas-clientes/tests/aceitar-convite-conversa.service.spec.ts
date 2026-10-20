import { Test } from '@nestjs/testing';
import { MarcarNotificacoesConviteLidasService } from 'src/modules/notificacoes/services/marcar-notificacoes-convite-lidas.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { AceitarConviteConversaService } from '../services/aceitar-convite-conversa.service';
import { criarParticipanteSubordinadoFake, criarUsuarioLogadoFake } from './fixtures';

describe('AceitarConviteConversaService', () => {
  const tx = { marcador: 'tx' };
  const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const repository = { buscarPorId: jest.fn(), responderConvite: jest.fn() };
  const marcarLidas = { execute: jest.fn() };
  const convidado = criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n, clienteId: 5n });
  let service: AceitarConviteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AceitarConviteConversaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversaParticipanteRepository, useValue: repository },
        { provide: MarcarNotificacoesConviteLidasService, useValue: marcarLidas },
      ],
    }).compile();
    service = moduleRef.get(AceitarConviteConversaService);
    repository.buscarPorId
      .mockResolvedValueOnce(
        criarParticipanteSubordinadoFake({ papel: 'convidado', status: 'pendente' }),
      )
      .mockResolvedValueOnce(
        criarParticipanteSubordinadoFake({ papel: 'convidado', status: 'aceito' }),
      );
    repository.responderConvite.mockResolvedValue(true);
  });

  it('marca o convite como aceito e as notificações dele como lidas na transação', async () => {
    const resultado = await service.execute(61n, convidado);

    expect(repository.responderConvite).toHaveBeenCalledWith(61n, 'aceito', tx);
    expect(marcarLidas.execute).toHaveBeenCalledWith(61n, tx);
    expect(repository.buscarPorId).toHaveBeenLastCalledWith(61n, tx);
    expect(resultado).toMatchObject({ id: 61n, status: 'aceito', eh_eu: true });
  });

  it('corrida: outra resposta ou remoção chegou antes (update condicional sem linhas)', async () => {
    repository.responderConvite.mockResolvedValue(false);

    await expect(service.execute(61n, convidado)).rejects.toThrow(
      'Este convite já foi respondido.',
    );
    expect(marcarLidas.execute).not.toHaveBeenCalled();
  });

  it('convite de outra pessoa é 404 (não revela que existe)', async () => {
    await expect(service.execute(61n, criarUsuarioLogadoFake({ id: 3n }))).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('convite já respondido não muda', async () => {
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue(
      criarParticipanteSubordinadoFake({ papel: 'convidado', status: 'aceito' }),
    );

    await expect(service.execute(61n, convidado)).rejects.toBeInstanceOf(
      ParticipanteConversaInvalidoException,
    );
    expect(repository.responderConvite).not.toHaveBeenCalled();
  });
});

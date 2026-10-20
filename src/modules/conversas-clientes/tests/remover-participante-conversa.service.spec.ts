import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { RemoverParticipanteConversaService } from '../services/remover-participante-conversa.service';
import {
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('RemoverParticipanteConversaService', () => {
  const repository = { buscarPorId: jest.fn(), remover: jest.fn(), buscarDaPessoa: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  let service: RemoverParticipanteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RemoverParticipanteConversaService,
        { provide: ConversaParticipanteRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(RemoverParticipanteConversaService);
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());
    repository.buscarPorId.mockResolvedValue(
      criarParticipanteSubordinadoFake({ papel: 'convidado' }),
    );
  });

  it('dono remove convidado', async () => {
    await service.execute(5n, 61n, usuario);
    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n });
    expect(repository.remover).toHaveBeenCalledWith(61n);
  });

  it('404 para participante inexistente ou de outra conversa', async () => {
    repository.buscarPorId.mockResolvedValueOnce(null);
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
    repository.buscarPorId.mockResolvedValueOnce(
      criarParticipanteSubordinadoFake({ clienteId: 6n, papel: 'convidado' }),
    );
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
    expect(repository.remover).not.toHaveBeenCalled();
  });

  it('não remove dono', async () => {
    repository.buscarPorId.mockResolvedValue(criarParticipanteSubordinadoFake({ papel: 'dono' }));
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaInvalidoException,
    );
  });

  it('dono do lado do cliente não remove a equipe', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteSubordinadoFake());
    repository.buscarPorId.mockResolvedValue(
      criarParticipanteFake({ id: 62n, userId: 8n, papel: 'convidado' }),
    );
    await expect(service.execute(5n, 62n, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
  });

  it('quem não é dono não remove', async () => {
    repository.buscarDaPessoa.mockResolvedValue(null);
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });

  it('removido ao mesmo tempo por outro dono vira 404, não 500', async () => {
    repository.remover.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('sumiu', { code: 'P2025', clientVersion: 'x' }),
    );

    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
  });
});

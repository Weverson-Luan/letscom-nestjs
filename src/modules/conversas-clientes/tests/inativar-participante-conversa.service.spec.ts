import { Test } from '@nestjs/testing';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { InativarParticipanteConversaService } from '../services/inativar-participante-conversa.service';
import {
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('InativarParticipanteConversaService', () => {
  const repository = {
    buscarDaPessoa: jest.fn(),
    buscarPorId: jest.fn(),
    alterarStatus: jest.fn(),
  };
  const usuario = criarUsuarioLogadoFake();
  const agora = new Date('2026-10-19T10:00:00.000Z');
  let service: InativarParticipanteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(agora);
    const moduleRef = await Test.createTestingModule({
      providers: [
        InativarParticipanteConversaService,
        { provide: ConversaParticipanteRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(InativarParticipanteConversaService);
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());
    repository.buscarPorId
      .mockResolvedValueOnce(criarParticipanteSubordinadoFake({ papel: 'convidado' }))
      .mockResolvedValueOnce(
        criarParticipanteSubordinadoFake({
          papel: 'convidado',
          status: 'inativo',
          inativadoEm: agora,
        }),
      );
    repository.alterarStatus.mockResolvedValue(true);
  });

  afterEach(() => jest.useRealTimers());

  it('dono inativa participante aceito e devolve o participante mapeado', async () => {
    const resultado = await service.execute(5n, 61n, usuario);

    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n });
    expect(repository.alterarStatus).toHaveBeenCalledWith(61n, 'aceito', {
      status: 'inativo',
      inativadoEm: agora,
    });
    expect(resultado).toMatchObject({ id: 61n, status: 'inativo', inativado_em: agora });
  });

  it.each(['pendente', 'recusado', 'inativo'] as const)(
    '400 para participante %s',
    async (status) => {
      repository.buscarPorId.mockReset();
      repository.buscarPorId.mockResolvedValue(
        criarParticipanteSubordinadoFake({ papel: 'convidado', status }),
      );
      await expect(service.execute(5n, 61n, usuario)).rejects.toThrow(
        'Só é possível inativar quem participa da conversa.',
      );
      expect(repository.alterarStatus).not.toHaveBeenCalled();
    },
  );

  it('400 quando outro dono inativou ao mesmo tempo', async () => {
    repository.alterarStatus.mockResolvedValue(false);
    await expect(service.execute(5n, 61n, usuario)).rejects.toThrow(
      'Este participante já foi inativado.',
    );
  });

  it('404 para participante de outra conversa', async () => {
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue(
      criarParticipanteSubordinadoFake({ clienteId: 6n, papel: 'convidado' }),
    );
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
  });

  it('não inativa dono', async () => {
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue(criarParticipanteSubordinadoFake({ papel: 'dono' }));
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaInvalidoException,
    );
  });

  it('403 para quem não é dono e para o dono do cliente inativando a equipe', async () => {
    repository.buscarDaPessoa.mockResolvedValueOnce(null);
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );

    repository.buscarDaPessoa.mockResolvedValueOnce(criarParticipanteSubordinadoFake());
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue(
      criarParticipanteFake({ id: 62n, userId: 8n, papel: 'convidado' }),
    );
    await expect(service.execute(5n, 62n, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
    expect(repository.alterarStatus).not.toHaveBeenCalled();
  });
});

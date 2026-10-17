import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { criarDonoFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('ConversaAcessoService', () => {
  const repository = { buscarDaPessoa: jest.fn(), listarDonos: jest.fn() };
  const operador = criarUsuarioLogadoFake();
  let service: ConversaAcessoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversaAcessoService,
        { provide: ConversaParticipanteRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ConversaAcessoService);
    repository.buscarDaPessoa.mockResolvedValue(null);
    repository.listarDonos.mockResolvedValue([
      criarDonoFake({ userId: 8n }),
      criarDonoFake({ id: 2n, userId: 5n }),
    ]);
  });

  it('devolve o acesso avaliado para participante com convite aceito', async () => {
    const participante = criarParticipanteFake({ papel: 'convidado' });
    repository.buscarDaPessoa.mockResolvedValue(participante);

    await expect(service.garantirAcesso(5n, operador)).resolves.toEqual({
      participante,
      iniciada: true,
      semDonoInterno: false,
    });
    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n }, undefined);
  });

  it('lança 403 para quem está fora da conversa iniciada', async () => {
    await expect(service.garantirAcesso(5n, operador)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
  });

  it('repassa a transação para as consultas', async () => {
    const tx = {} as never;
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());

    await service.garantirAcesso(5n, operador, tx);

    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n }, tx);
    expect(repository.listarDonos).toHaveBeenCalledWith(5n, tx);
  });
});

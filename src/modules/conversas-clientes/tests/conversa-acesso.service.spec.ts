import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { criarDonoFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('ConversaAcessoService', () => {
  const repository = { buscarDaPessoa: jest.fn(), listarDonos: jest.fn() };
  const mensagemRepository = { buscarDataPrimeiraMensagemDoAutor: jest.fn() };
  const operador = criarUsuarioLogadoFake();
  let service: ConversaAcessoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversaAcessoService,
        { provide: ConversaParticipanteRepository, useValue: repository },
        { provide: ConversaMensagemRepository, useValue: mensagemRepository },
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
      primeiraMensagemDoUsuarioEm: undefined,
    });
    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n }, undefined);
    expect(mensagemRepository.buscarDataPrimeiraMensagemDoAutor).not.toHaveBeenCalled();
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

  it('produção sem convite entra e recebe a data da primeira mensagem dele', async () => {
    const producao = criarUsuarioLogadoFake({ roles: ['producao'] });
    const primeiraEm = new Date('2026-10-20T10:00:00.000Z');
    mensagemRepository.buscarDataPrimeiraMensagemDoAutor.mockResolvedValue(primeiraEm);

    await expect(service.garantirAcesso(5n, producao)).resolves.toMatchObject({
      participante: null,
      primeiraMensagemDoUsuarioEm: primeiraEm,
    });
    expect(mensagemRepository.buscarDataPrimeiraMensagemDoAutor).toHaveBeenCalledWith(
      5n,
      7n,
      undefined,
    );
  });
});

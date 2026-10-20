import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ListarParticipantesConversaService } from '../services/listar-participantes-conversa.service';
import {
  criarDonoFake,
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('ListarParticipantesConversaService', () => {
  const repository = { listar: jest.fn(), buscarDaPessoa: jest.fn(), listarDonos: jest.fn() };
  const mensagemRepository = { ehClienteAtivo: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  let service: ListarParticipantesConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarParticipantesConversaService,
        { provide: ConversaParticipanteRepository, useValue: repository },
        { provide: ConversaMensagemRepository, useValue: mensagemRepository },
      ],
    }).compile();
    service = moduleRef.get(ListarParticipantesConversaService);
    mensagemRepository.ehClienteAtivo.mockResolvedValue(true);
    repository.listarDonos.mockResolvedValue([criarDonoFake({ userId: 8n })]);
    repository.listar.mockResolvedValue([
      criarParticipanteFake(),
      criarParticipanteSubordinadoFake({ papel: 'convidado', status: 'pendente' }),
    ]);
  });

  it('dono vê participantes e pode convidar', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());

    const resultado = await service.execute(5n, usuario);

    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { userId: 7n });
    expect(resultado).toMatchObject({
      iniciada: true,
      tem_acesso: true,
      pode_convidar: true,
      minha_participacao: { id: 60n, papel: 'dono', status: 'aceito' },
    });
    expect(resultado.participantes).toHaveLength(2);
  });

  it('convidado pendente vê só a própria participação (para aceitar/recusar)', async () => {
    repository.buscarDaPessoa.mockResolvedValue(
      criarParticipanteFake({ papel: 'convidado', status: 'pendente' }),
    );

    await expect(service.execute(5n, usuario)).resolves.toEqual({
      iniciada: true,
      tem_acesso: false,
      pode_convidar: false,
      minha_participacao: { id: 60n, papel: 'convidado', status: 'pendente' },
      participantes: [],
    });
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('admin sem participação vê os participantes mas não convida', async () => {
    repository.buscarDaPessoa.mockResolvedValue(null);

    const resultado = await service.execute(5n, criarUsuarioLogadoFake({ roles: ['admin'] }));

    expect(resultado).toMatchObject({
      tem_acesso: true,
      pode_convidar: false,
      minha_participacao: null,
    });
  });

  it('404 quando o id não é de um cliente ativo', async () => {
    mensagemRepository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(7n, usuario)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(repository.buscarDaPessoa).not.toHaveBeenCalled();
  });
});

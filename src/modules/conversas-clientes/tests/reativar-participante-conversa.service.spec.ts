import { Test } from '@nestjs/testing';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ReativarParticipanteConversaService } from '../services/reativar-participante-conversa.service';
import {
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('ReativarParticipanteConversaService', () => {
  const repository = {
    buscarDaPessoa: jest.fn(),
    buscarPorId: jest.fn(),
    alterarStatus: jest.fn(),
    ehSubordinadoAtivoDoCliente: jest.fn(),
    ehClientePrincipalAtivo: jest.fn(),
    ehInternoAtivo: jest.fn(),
  };
  const usuario = criarUsuarioLogadoFake();
  const inativo = criarParticipanteSubordinadoFake({
    papel: 'convidado',
    status: 'inativo',
    inativadoEm: new Date('2026-10-18T10:00:00.000Z'),
  });
  let service: ReativarParticipanteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReativarParticipanteConversaService,
        { provide: ConversaParticipanteRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(ReativarParticipanteConversaService);
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());
    repository.buscarPorId
      .mockResolvedValueOnce(inativo)
      .mockResolvedValueOnce({ ...inativo, status: 'aceito', inativadoEm: null });
    repository.alterarStatus.mockResolvedValue(true);
    repository.ehSubordinadoAtivoDoCliente.mockResolvedValue(true);
    repository.ehClientePrincipalAtivo.mockResolvedValue(true);
    repository.ehInternoAtivo.mockResolvedValue(true);
  });

  it('dono reativa subordinado inativo, que volta como aceito sem novo convite', async () => {
    const resultado = await service.execute(5n, 61n, usuario);

    expect(repository.ehSubordinadoAtivoDoCliente).toHaveBeenCalledWith(5n, 3n);
    expect(repository.alterarStatus).toHaveBeenCalledWith(61n, 'inativo', {
      status: 'aceito',
      inativadoEm: null,
    });
    expect(resultado).toMatchObject({ id: 61n, status: 'aceito', inativado_em: null });
  });

  it('confere o cadastro do cliente principal e do operador', async () => {
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue({ ...inativo, subordinadoId: null, userId: 5n });
    await service.execute(5n, 61n, usuario);
    expect(repository.ehClientePrincipalAtivo).toHaveBeenCalledWith(5n);

    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue({ ...inativo, subordinadoId: null, userId: 8n });
    await service.execute(5n, 61n, usuario);
    expect(repository.ehInternoAtivo).toHaveBeenCalledWith(8n);
  });

  it('400 quando o cadastro da pessoa foi desativado', async () => {
    repository.ehSubordinadoAtivoDoCliente.mockResolvedValue(false);
    await expect(service.execute(5n, 61n, usuario)).rejects.toThrow(
      'Não é possível reativar: o cadastro desta pessoa está desativado.',
    );
    expect(repository.alterarStatus).not.toHaveBeenCalled();
  });

  it.each(['pendente', 'aceito', 'recusado'] as const)(
    '400 para participante %s',
    async (status) => {
      repository.buscarPorId.mockReset();
      repository.buscarPorId.mockResolvedValue({ ...inativo, status });
      await expect(service.execute(5n, 61n, usuario)).rejects.toThrow(
        'Só é possível reativar quem está com o acesso inativo.',
      );
    },
  );

  it('400 quando outro dono reativou ao mesmo tempo', async () => {
    repository.alterarStatus.mockResolvedValue(false);
    await expect(service.execute(5n, 61n, usuario)).rejects.toThrow(
      'Este participante já foi reativado.',
    );
  });

  it('404 para participante de outra conversa', async () => {
    repository.buscarPorId.mockReset();
    repository.buscarPorId.mockResolvedValue({ ...inativo, clienteId: 6n });
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      ParticipanteConversaNaoEncontradoException,
    );
  });

  it('403 para quem não é dono', async () => {
    repository.buscarDaPessoa.mockResolvedValue(null);
    await expect(service.execute(5n, 61n, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
  });
});

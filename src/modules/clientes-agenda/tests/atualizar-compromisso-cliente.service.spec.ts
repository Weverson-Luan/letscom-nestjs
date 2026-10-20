import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { CompromissoNaoEncontradoException } from '../exceptions/compromisso-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { ResponsavelCompromissoInvalidoException } from '../exceptions/responsavel-compromisso-invalido.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';
import { AtualizarCompromissoClienteService } from '../services/atualizar-compromisso-cliente.service';
import { ValidacaoResponsavelCompromissoService } from '../services/validacao-responsavel-compromisso.service';
import { criarCompromissoFake } from './fixtures';

describe('AtualizarCompromissoClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn(), buscarPorId: jest.fn(), atualizar: jest.fn() };
  const responsavelRepository = {
    ehUsuarioInternoAtivo: jest.fn(),
    ehSubordinadoAtivoDoCliente: jest.fn(),
  };
  let service: AtualizarCompromissoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AtualizarCompromissoClienteService,
        { provide: ClienteCompromissoRepository, useValue: repository },
        ValidacaoResponsavelCompromissoService,
        { provide: ResponsavelCompromissoRepository, useValue: responsavelRepository },
      ],
    }).compile();
    service = moduleRef.get(AtualizarCompromissoClienteService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    repository.buscarPorId.mockResolvedValue(criarCompromissoFake());
    repository.atualizar.mockResolvedValue(criarCompromissoFake({ titulo: 'Novo' }));
    responsavelRepository.ehUsuarioInternoAtivo.mockResolvedValue(true);
    responsavelRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(true);
  });

  it('atualiza só os campos enviados e devolve o formato interno', async () => {
    const resultado = await service.execute(5n, 1n, {
      titulo: 'Novo',
      tipo: 'visita',
      descricao: ' Detalhes ',
      agendado_para: '2026-11-01T10:00:00.000Z',
      visivel_cliente: false,
      responsavel_id: 9,
    });

    expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 1n);
    expect(responsavelRepository.ehUsuarioInternoAtivo).toHaveBeenCalledWith(9n);
    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      titulo: 'Novo',
      tipo: 'visita',
      descricao: 'Detalhes',
      agendadoPara: new Date('2026-11-01T10:00:00.000Z'),
      visivelCliente: false,
      responsavelId: 9n,
      responsavelSubordinadoId: null,
    });
    expect(resultado).toEqual(expect.objectContaining({ id: 1n, titulo: 'Novo' }));
  });

  it('corpo vazio não altera campos', async () => {
    await service.execute(5n, 1n, {});

    expect(repository.atualizar).toHaveBeenCalledWith(1n, {});
  });

  it('responsavel_id null remove o responsável sem validar', async () => {
    await service.execute(5n, 1n, { responsavel_id: null });

    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.atualizar).toHaveBeenCalledWith(1n, { responsavelId: null });
  });

  it.each([
    ['vazia', ''],
    ['só espaços', '  '],
    ['null', null],
  ])('descrição %s limpa a descrição (grava null)', async (_caso, descricao) => {
    await service.execute(5n, 1n, { descricao });

    expect(repository.atualizar).toHaveBeenCalledWith(1n, { descricao: null });
  });

  it('manter o mesmo responsável não revalida', async () => {
    await service.execute(5n, 1n, { responsavel_id: 8 });

    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      responsavelId: 8n,
      responsavelSubordinadoId: null,
    });
  });

  it('concluir grava concluido_em = agora', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T15:00:00.000Z'));
    try {
      await service.execute(5n, 1n, { status: 'concluido' });
    } finally {
      jest.useRealTimers();
    }

    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      status: 'concluido',
      concluidoEm: new Date('2026-10-21T15:00:00.000Z'),
    });
  });

  it('concluir o que já estava concluído mantém a data original', async () => {
    const concluidoEm = new Date('2026-10-20T09:00:00.000Z');
    repository.buscarPorId.mockResolvedValue(
      criarCompromissoFake({ status: 'concluido', concluidoEm }),
    );

    await service.execute(5n, 1n, { status: 'concluido' });

    expect(repository.atualizar).toHaveBeenCalledWith(1n, { status: 'concluido', concluidoEm });
  });

  it.each(['pendente', 'cancelado'] as const)(
    'mudar para %s limpa concluido_em',
    async (status) => {
      repository.buscarPorId.mockResolvedValue(
        criarCompromissoFake({ status: 'concluido', concluidoEm: new Date() }),
      );

      await service.execute(5n, 1n, { status });

      expect(repository.atualizar).toHaveBeenCalledWith(1n, { status, concluidoEm: null });
    },
  );

  it('lança 404 quando o cliente não está ativo', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, 1n, {})).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.buscarPorId).not.toHaveBeenCalled();
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 404 quando o compromisso não é do cliente ou foi excluído', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.execute(5n, 1n, {})).rejects.toBeInstanceOf(
      CompromissoNaoEncontradoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 400 quando o novo responsável não é usuário interno ativo', async () => {
    responsavelRepository.ehUsuarioInternoAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, 1n, { responsavel_id: 99 })).rejects.toBeInstanceOf(
      ResponsavelCompromissoInvalidoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('trocar para subordinado valida o vínculo e limpa responsavel_id', async () => {
    await service.execute(5n, 1n, { responsavel_subordinado_id: 3 });

    expect(responsavelRepository.ehSubordinadoAtivoDoCliente).toHaveBeenCalledWith(5n, 3n);
    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      responsavelId: null,
      responsavelSubordinadoId: 3n,
    });
  });

  it('manter o mesmo subordinado não revalida', async () => {
    repository.buscarPorId.mockResolvedValue(
      criarCompromissoFake({ responsavelId: null, responsavelSubordinadoId: 3n }),
    );

    await service.execute(5n, 1n, { responsavel_subordinado_id: 3 });

    expect(responsavelRepository.ehSubordinadoAtivoDoCliente).not.toHaveBeenCalled();
  });

  it('o próprio cliente pode ser o novo responsável', async () => {
    await service.execute(5n, 1n, { responsavel_id: 5 });

    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      responsavelId: 5n,
      responsavelSubordinadoId: null,
    });
  });

  it('os dois null removem qualquer responsável', async () => {
    await service.execute(5n, 1n, { responsavel_id: null, responsavel_subordinado_id: null });

    expect(repository.atualizar).toHaveBeenCalledWith(1n, {
      responsavelId: null,
      responsavelSubordinadoId: null,
    });
  });

  it('lança 400 quando os dois responsáveis vêm preenchidos', async () => {
    await expect(
      service.execute(5n, 1n, { responsavel_id: 8, responsavel_subordinado_id: 3 }),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoDuplicadoException);
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('lança 400 quando o subordinado não é ativo do cliente', async () => {
    responsavelRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(false);

    await expect(service.execute(5n, 1n, { responsavel_subordinado_id: 3 })).rejects.toBeInstanceOf(
      ResponsavelCompromissoInvalidoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });
});

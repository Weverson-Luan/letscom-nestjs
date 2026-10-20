import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { ResponsavelCompromissoInvalidoException } from '../exceptions/responsavel-compromisso-invalido.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';
import { CriarCompromissoClienteService } from '../services/criar-compromisso-cliente.service';
import { ValidacaoResponsavelCompromissoService } from '../services/validacao-responsavel-compromisso.service';
import { criarCompromissoFake, criarUsuarioLogadoFake } from './fixtures';

describe('CriarCompromissoClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn(), criar: jest.fn() };
  const responsavelRepository = {
    ehUsuarioInternoAtivo: jest.fn(),
    ehSubordinadoAtivoDoCliente: jest.fn(),
  };
  let service: CriarCompromissoClienteService;
  const usuario = criarUsuarioLogadoFake();

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarCompromissoClienteService,
        { provide: ClienteCompromissoRepository, useValue: repository },
        ValidacaoResponsavelCompromissoService,
        { provide: ResponsavelCompromissoRepository, useValue: responsavelRepository },
      ],
    }).compile();
    service = moduleRef.get(CriarCompromissoClienteService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    responsavelRepository.ehUsuarioInternoAtivo.mockResolvedValue(true);
    responsavelRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(true);
    repository.criar.mockResolvedValue(criarCompromissoFake());
  });

  it('cria com todos os campos, autor = usuário logado, e devolve o formato interno', async () => {
    const resultado = await service.execute(
      5n,
      {
        titulo: 'Apresentar proposta',
        tipo: 'reuniao',
        descricao: '  Levar amostras PVC ',
        agendado_para: '2026-10-21T14:00:00.000Z',
        responsavel_id: 8,
        visivel_cliente: true,
      },
      usuario,
    );

    expect(responsavelRepository.ehUsuarioInternoAtivo).toHaveBeenCalledWith(8n);
    expect(repository.criar).toHaveBeenCalledWith({
      clienteId: 5n,
      autorId: 7n,
      responsavelId: 8n,
      responsavelSubordinadoId: null,
      tipo: 'reuniao',
      titulo: 'Apresentar proposta',
      descricao: 'Levar amostras PVC',
      agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
      visivelCliente: true,
    });
    expect(resultado).toEqual(
      expect.objectContaining({ id: 1n, autor: { id: 7n, nome: 'Operador' } }),
    );
  });

  it('aplica os padrões: tipo nota, sem responsável, sem descrição e não visível', async () => {
    await service.execute(
      5n,
      { titulo: 'Ligar', agendado_para: '2026-10-21T14:00:00.000Z', descricao: '   ' },
      usuario,
    );

    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'nota',
        responsavelId: null,
        responsavelSubordinadoId: null,
        descricao: null,
        visivelCliente: false,
      }),
    );
  });

  it.each([
    ['vazia', ''],
    ['null', null],
  ])('descrição %s é gravada como null', async (_caso, descricao) => {
    await service.execute(
      5n,
      { titulo: 'Ligar', agendado_para: '2026-10-21T14:00:00.000Z', descricao },
      usuario,
    );

    expect(repository.criar).toHaveBeenCalledWith(expect.objectContaining({ descricao: null }));
  });

  it('lança 404 quando o cliente não está ativo, sem criar', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(
      service.execute(5n, { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z' }, usuario),
    ).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('lança 400 quando o responsável não é usuário interno ativo, sem criar', async () => {
    responsavelRepository.ehUsuarioInternoAtivo.mockResolvedValue(false);

    await expect(
      service.execute(
        5n,
        { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z', responsavel_id: 99 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoInvalidoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('o próprio cliente pode ser responsável sem consultar a equipe', async () => {
    await service.execute(
      5n,
      { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z', responsavel_id: 5 },
      usuario,
    );

    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ responsavelId: 5n, responsavelSubordinadoId: null }),
    );
  });

  it('cria com subordinado do cliente como responsável', async () => {
    await service.execute(
      5n,
      { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z', responsavel_subordinado_id: 3 },
      usuario,
    );

    expect(responsavelRepository.ehSubordinadoAtivoDoCliente).toHaveBeenCalledWith(5n, 3n);
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ responsavelId: null, responsavelSubordinadoId: 3n }),
    );
  });

  it('lança 400 quando o subordinado não é ativo do cliente, sem criar', async () => {
    responsavelRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(false);

    await expect(
      service.execute(
        5n,
        { titulo: 'x', agendado_para: '2026-10-21T14:00:00.000Z', responsavel_subordinado_id: 3 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoInvalidoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('lança 400 quando os dois responsáveis vêm juntos, sem validar nem criar', async () => {
    await expect(
      service.execute(
        5n,
        {
          titulo: 'x',
          agendado_para: '2026-10-21T14:00:00.000Z',
          responsavel_id: 8,
          responsavel_subordinado_id: 3,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoDuplicadoException);
    expect(responsavelRepository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.criar).not.toHaveBeenCalled();
  });
});

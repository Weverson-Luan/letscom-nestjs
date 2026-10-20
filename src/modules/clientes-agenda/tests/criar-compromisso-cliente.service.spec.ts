import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoCompromissoInvalidoException } from '../exceptions/anexo-compromisso-invalido.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ResponsavelCompromissoDuplicadoException } from '../exceptions/responsavel-compromisso-duplicado.exception';
import { ResponsavelCompromissoInvalidoException } from '../exceptions/responsavel-compromisso-invalido.exception';
import { ClienteCompromissoRepository } from '../repositories/cliente-compromisso.repository';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';
import { CriarCompromissoClienteService } from '../services/criar-compromisso-cliente.service';
import { ValidacaoResponsavelCompromissoService } from '../services/validacao-responsavel-compromisso.service';
import {
  criarAnexoCompromissoFake,
  criarArquivoFake,
  criarCompromissoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-fixo') }));

describe('CriarCompromissoClienteService', () => {
  const repository = {
    ehClienteAtivo: jest.fn(),
    criar: jest.fn(),
    criarAnexos: jest.fn(),
    buscarPorId: jest.fn(),
  };
  const tx = { tx: true };
  const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const storage = { put: jest.fn(), delete: jest.fn() };
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
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
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
    expect(repository.criar).toHaveBeenCalledWith(
      {
        clienteId: 5n,
        autorId: 7n,
        responsavelId: 8n,
        responsavelSubordinadoId: null,
        tipo: 'reuniao',
        titulo: 'Apresentar proposta',
        descricao: 'Levar amostras PVC',
        agendadoPara: new Date('2026-10-21T14:00:00.000Z'),
        visivelCliente: true,
      },
      tx,
    );
    expect(resultado).toEqual(
      expect.objectContaining({ id: 1n, autor: { id: 7n, nome: 'Operador' }, anexos: [] }),
    );
    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.criarAnexos).not.toHaveBeenCalled();
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
      tx,
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

    expect(repository.criar).toHaveBeenCalledWith(expect.objectContaining({ descricao: null }), tx);
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
      tx,
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
      tx,
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

  describe('anexos', () => {
    const dto = { titulo: 'Reunião', agendado_para: '2026-10-21T14:00:00.000Z' };
    // como o busboy entrega um nome UTF-8 lido como latin1
    const comoLatin1 = (nome: string) => Buffer.from(nome, 'utf8').toString('latin1');

    beforeEach(() => {
      repository.buscarPorId.mockResolvedValue(
        criarCompromissoFake({ anexos: [criarAnexoCompromissoFake()] }),
      );
    });

    it('sobe no storage, grava compromisso + anexos na transação e devolve os anexos', async () => {
      const arquivo = criarArquivoFake({ originalname: comoLatin1('orçamento.pdf') });

      const resultado = await service.execute(5n, dto, usuario, [arquivo]);

      expect(storage.put).toHaveBeenCalledWith(
        'clientes/5/agenda/compromissos/uuid-fixo.pdf',
        arquivo.buffer,
      );
      expect(repository.criar).toHaveBeenCalledWith(expect.objectContaining({ clienteId: 5n }), tx);
      expect(repository.criarAnexos).toHaveBeenCalledWith(
        [
          {
            compromissoId: 1n,
            nomeOriginal: 'orçamento.pdf',
            filePath: 'clientes/5/agenda/compromissos/uuid-fixo.pdf',
            mimeType: 'application/pdf',
            tamanhoBytes: 3,
          },
        ],
        tx,
      );
      expect(repository.buscarPorId).toHaveBeenCalledWith(5n, 1n, tx);
      expect(resultado.anexos).toEqual([
        {
          id: 40n,
          nome: 'orçamento.pdf',
          mime_type: 'application/pdf',
          tamanho_bytes: 3,
          created_at: new Date('2026-10-19T12:00:00.000Z'),
        },
      ]);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('usa o tamanho do buffer e mime null quando o multer não informa', async () => {
      await service.execute(5n, dto, usuario, [
        criarArquivoFake({ size: undefined, mimetype: undefined, buffer: Buffer.from('abcd') }),
      ]);

      expect(repository.criarAnexos).toHaveBeenCalledWith(
        [expect.objectContaining({ mimeType: null, tamanhoBytes: 4 })],
        tx,
      );
    });

    it('anexo inválido lança 400 antes de subir ou gravar qualquer coisa', async () => {
      await expect(
        service.execute(5n, dto, usuario, [criarArquivoFake({ originalname: 'virus.exe' })]),
      ).rejects.toBeInstanceOf(AnexoCompromissoInvalidoException);
      await expect(
        service.execute(
          5n,
          dto,
          usuario,
          Array.from({ length: 6 }, () => criarArquivoFake()),
        ),
      ).rejects.toBeInstanceOf(AnexoCompromissoInvalidoException);

      expect(storage.put).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('cliente inválido não sobe anexos', async () => {
      repository.ehClienteAtivo.mockResolvedValue(false);

      await expect(service.execute(5n, dto, usuario, [criarArquivoFake()])).rejects.toBeInstanceOf(
        ClienteNaoEncontradoException,
      );
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('responsável inválido não sobe anexos', async () => {
      responsavelRepository.ehUsuarioInternoAtivo.mockResolvedValue(false);

      await expect(
        service.execute(5n, { ...dto, responsavel_id: 99 }, usuario, [criarArquivoFake()]),
      ).rejects.toBeInstanceOf(ResponsavelCompromissoInvalidoException);
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('apaga do storage o que subiu quando a transação falha', async () => {
      repository.criarAnexos.mockRejectedValueOnce(new Error('falha no banco'));
      storage.delete.mockRejectedValueOnce(new Error('storage fora'));

      await expect(
        service.execute(5n, dto, usuario, [
          criarArquivoFake(),
          criarArquivoFake({ originalname: 'foto.png' }),
        ]),
      ).rejects.toThrow('falha no banco');

      expect(storage.delete).toHaveBeenCalledTimes(2);
      expect(storage.delete).toHaveBeenCalledWith('clientes/5/agenda/compromissos/uuid-fixo.pdf');
      expect(storage.delete).toHaveBeenCalledWith('clientes/5/agenda/compromissos/uuid-fixo.png');
    });

    it('apaga só os arquivos que já tinham subido quando o upload falha no meio', async () => {
      storage.put.mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('upload falhou'));

      await expect(
        service.execute(5n, dto, usuario, [
          criarArquivoFake(),
          criarArquivoFake({ originalname: 'foto.png' }),
        ]),
      ).rejects.toThrow('upload falhou');

      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith('clientes/5/agenda/compromissos/uuid-fixo.pdf');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

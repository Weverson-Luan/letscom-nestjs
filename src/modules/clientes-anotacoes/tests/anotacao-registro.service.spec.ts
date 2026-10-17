import { Test } from '@nestjs/testing';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { AnotacaoRegistroService } from '../services/anotacao-registro.service';
import { criarAnexoFake, criarAnotacaoFake, criarArquivoFake } from './fixtures';

jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));

describe('AnotacaoRegistroService', () => {
  const tx = { marcador: 'tx' };
  const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const repository = {
    criar: jest.fn(),
    criarAnexos: jest.fn(),
    buscarPorId: jest.fn(),
    buscarNomeCliente: jest.fn(),
    buscarIdsInternosDaConversa: jest.fn(),
    buscarIdsLadoCliente: jest.fn(),
  };
  const storage = { put: jest.fn(), delete: jest.fn() };
  const emissor = { emitir: jest.fn() };
  let service: AnotacaoRegistroService;

  const autorInterno = { tipo: 'interno' as const, userId: 7n, nome: 'Operador' };
  const autorSubordinado = { tipo: 'subordinado' as const, subordinadoId: 3n, nome: 'Compras' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnotacaoRegistroService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClienteAnotacaoRepository, useValue: repository },
        { provide: StorageService, useValue: storage },
        { provide: NotificacaoEmissorService, useValue: emissor },
      ],
    }).compile();
    service = moduleRef.get(AnotacaoRegistroService);
    repository.criar.mockResolvedValue({ id: 30n });
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake());
    repository.buscarNomeCliente.mockResolvedValue('Empresa X');
    repository.buscarIdsLadoCliente.mockResolvedValue({
      clienteUserId: 5n,
      subordinadoIds: [3n, 4n],
    });
    repository.buscarIdsInternosDaConversa.mockResolvedValue([7n, 8n]);
  });

  it('equipe escreve: grava anotação e notifica cliente e subordinados na mesma transação', async () => {
    const resultado = await service.registrar({
      clienteId: 5n,
      autor: autorInterno,
      tipo: 'ligacao',
      conteudo: '  Orçamento enviado  ',
      arquivos: [],
    });

    expect(repository.criar).toHaveBeenCalledWith(
      {
        clienteId: 5n,
        autorTipo: 'interno',
        autorId: 7n,
        autorSubordinadoId: null,
        tipo: 'ligacao',
        conteudo: 'Orçamento enviado',
      },
      tx,
    );
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ userId: 5n }, { subordinadoId: 3n }, { subordinadoId: 4n }],
      {
        tipo: 'anotacao_cliente',
        titulo: 'Nova mensagem da equipe Letscom',
        mensagem: 'Operador: Orçamento enviado',
        link: '/minhas-anotacoes',
        anotacaoId: 30n,
      },
      tx,
    );
    expect(repository.buscarIdsInternosDaConversa).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
    expect(resultado).toEqual(criarAnotacaoFake());
  });

  it('cliente principal inativo não é notificado, só os subordinados', async () => {
    repository.buscarIdsLadoCliente.mockResolvedValue({
      clienteUserId: null,
      subordinadoIds: [3n],
    });

    await service.registrar({
      clienteId: 5n,
      autor: autorInterno,
      tipo: 'nota',
      conteudo: 'x',
      arquivos: [],
    });

    expect(emissor.emitir).toHaveBeenCalledWith([{ subordinadoId: 3n }], expect.anything(), tx);
  });

  it('subordinado escreve: grava como subordinado, sobe anexo e notifica a equipe da conversa', async () => {
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake({ anexos: [criarAnexoFake()] }));
    const arquivo = criarArquivoFake();

    await service.registrar({
      clienteId: 5n,
      autor: autorSubordinado,
      tipo: 'nota',
      arquivos: [arquivo],
    });

    expect(storage.put).toHaveBeenCalledWith('clientes/5/anotacoes/uuid-fixo.pdf', arquivo.buffer);
    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        autorTipo: 'subordinado',
        autorId: null,
        autorSubordinadoId: 3n,
        conteudo: '',
      }),
      tx,
    );
    expect(repository.criarAnexos).toHaveBeenCalledWith(
      [
        {
          anotacaoId: 30n,
          nomeOriginal: 'proposta.pdf',
          filePath: 'clientes/5/anotacoes/uuid-fixo.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: 8,
        },
      ],
      tx,
    );
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ userId: 7n }, { userId: 8n }],
      expect.objectContaining({
        titulo: 'Empresa X respondeu',
        mensagem: 'Compras: Enviou 1 anexo.',
        link: '/clientes/5',
      }),
      tx,
    );
    expect(repository.buscarIdsLadoCliente).not.toHaveBeenCalled();
  });

  it('recusa anotação vazia sem tocar em storage ou banco', async () => {
    await expect(
      service.registrar({
        clienteId: 5n,
        autor: autorInterno,
        tipo: 'nota',
        conteudo: ' ',
        arquivos: [],
      }),
    ).rejects.toBeInstanceOf(AnotacaoClienteInvalidaException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(repository.buscarNomeCliente).not.toHaveBeenCalled();
  });

  it('apaga do storage os arquivos enviados quando a notificação falha (rollback)', async () => {
    emissor.emitir.mockRejectedValueOnce(new Error('falha ao notificar'));

    await expect(
      service.registrar({
        clienteId: 5n,
        autor: autorInterno,
        tipo: 'nota',
        arquivos: [criarArquivoFake(), criarArquivoFake()],
      }),
    ).rejects.toThrow('falha ao notificar');
    expect(storage.delete).toHaveBeenCalledTimes(2);
  });

  it('apaga só os arquivos já enviados quando o storage falha no meio', async () => {
    storage.put.mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('storage fora'));

    await expect(
      service.registrar({
        clienteId: 5n,
        autor: autorInterno,
        tipo: 'nota',
        arquivos: [criarArquivoFake(), criarArquivoFake()],
      }),
    ).rejects.toThrow('storage fora');
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

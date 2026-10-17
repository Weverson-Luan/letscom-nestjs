import { Test } from '@nestjs/testing';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
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
  };
  const participanteRepository = { listarAceitosAtivos: jest.fn() };
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
        { provide: ConversaParticipanteRepository, useValue: participanteRepository },
        { provide: StorageService, useValue: storage },
        { provide: NotificacaoEmissorService, useValue: emissor },
      ],
    }).compile();
    service = moduleRef.get(AnotacaoRegistroService);
    repository.criar.mockResolvedValue({ id: 30n });
    repository.buscarPorId.mockResolvedValue(criarAnotacaoFake());
    repository.buscarNomeCliente.mockResolvedValue('Empresa X');
    // participantes aceitos: operador (7), outro interno (8), cliente principal (5), subordinados 3 e 4
    participanteRepository.listarAceitosAtivos.mockResolvedValue([
      { userId: 7n, subordinadoId: null },
      { userId: 8n, subordinadoId: null },
      { userId: 5n, subordinadoId: null },
      { userId: null, subordinadoId: 3n },
      { userId: null, subordinadoId: 4n },
    ]);
  });

  it('equipe escreve: grava anotação e notifica os demais participantes de cada lado na transação', async () => {
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
    expect(participanteRepository.listarAceitosAtivos).toHaveBeenCalledWith(5n, tx);
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ userId: 8n }],
      expect.objectContaining({
        titulo: 'Nova mensagem na conversa com Empresa X',
        link: '/clientes/5',
      }),
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
    expect(storage.put).not.toHaveBeenCalled();
    expect(resultado).toEqual(criarAnotacaoFake());
  });

  it('roda o gancho de início na transação antes de gravar e notifica quem ele registrou', async () => {
    participanteRepository.listarAceitosAtivos.mockResolvedValue([]);
    const ordem: string[] = [];
    const antesDeGravar = jest.fn(async () => {
      ordem.push('gancho');
      participanteRepository.listarAceitosAtivos.mockResolvedValue([
        { userId: 7n, subordinadoId: null },
        { userId: null, subordinadoId: 3n },
      ]);
    });
    repository.criar.mockImplementation(async () => {
      ordem.push('criar');
      return { id: 30n };
    });

    await service.registrar({
      clienteId: 5n,
      autor: autorInterno,
      tipo: 'nota',
      conteudo: 'Olá',
      arquivos: [],
      antesDeGravar,
    });

    expect(antesDeGravar).toHaveBeenCalledWith(tx);
    expect(ordem).toEqual(['gancho', 'criar']);
    expect(emissor.emitir).toHaveBeenCalledWith([{ subordinadoId: 3n }], expect.anything(), tx);
  });

  it('subordinado escreve: grava, sobe anexo e notifica a equipe e o resto do lado do cliente', async () => {
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
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ userId: 5n }, { subordinadoId: 4n }],
      expect.objectContaining({ titulo: 'Nova mensagem na conversa', link: '/minhas-anotacoes' }),
      tx,
    );
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

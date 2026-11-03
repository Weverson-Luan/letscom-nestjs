/**
 * IMPORTS
 */
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// helpers do módulo (mensagem padrão da liberação)
import { LiberacaoRemessaMensagemHelper } from '../helpers/liberacao-remessa-mensagem.helper';

// repositories do módulo (liberações já registradas)
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';

// services do módulo (serviço testado e envio de e-mail)
import { LiberacaoRemessaBalcaoEmailService } from '../services/liberacao-remessa-balcao-email.service';
import { LiberarRemessasLoteBalcaoService } from '../services/liberar-remessas-lote-balcao.service';

describe('LiberarRemessasLoteBalcaoService — e-mails por destinatário', () => {
  const transacao = {
    remessaLiberadaBalcao: { createMany: jest.fn() },
    remessa: { updateMany: jest.fn() },
  };
  const prisma = {
    remessa: { findMany: jest.fn() },
    tipoEntregaUser: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (transacaoMock: typeof transacao) => unknown) =>
      callback(transacao),
    ),
  };
  const repository = { findRemessaIdsLiberadas: jest.fn() };
  const mensagemHelper = {
    carregarEnderecosResidenciaisPorClientes: jest.fn(),
    gerarMensagem: jest.fn(),
  };
  const emailService = { enviarSemExcecao: jest.fn() };
  const config = { get: jest.fn(() => 0) };
  let service: LiberarRemessasLoteBalcaoService;

  const usuario = { id: 1n, roles: ['expedicao'] };
  const titular = { email: 'cadastro@cliente.com', nome: 'Titular' };
  const ana = { email: 'ana@cliente.com', nome: 'Ana' };
  const bruno = { email: 'bruno@cliente.com', nome: 'Bruno' };

  const criarRemessa = (
    id: bigint,
    clienteId: bigint,
    solicitanteSubordinado: { email: string | null; nome: string } | null,
    solicitante: { email: string | null; nome: string } = titular,
  ) => ({
    id,
    numeroRemessa: `R${id}`,
    clienteId,
    status: 'conferido',
    situacao: 'conferido',
    cliente: { nome: `Cliente ${clienteId}` },
    userIdSolicitanteRemessa: 5n,
    solicitante,
    usersSolicitanteSubordinadoId: solicitanteSubordinado ? 8n : null,
    solicitanteSubordinado,
  });

  const enviosRealizados = () =>
    emailService.enviarSemExcecao.mock.calls.map(([remessa, , , observacao, , assunto]) => ({
      id: remessa.id,
      observacao,
      assunto,
    }));

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 1n, nome: 'Expedidor' });
    prisma.tipoEntregaUser.findMany.mockResolvedValue([
      { clienteId: 100n, tipoEntregaId: 2n },
      { clienteId: 200n, tipoEntregaId: 2n },
    ]);
    repository.findRemessaIdsLiberadas.mockResolvedValue([]);
    mensagemHelper.carregarEnderecosResidenciaisPorClientes.mockResolvedValue(new Map());
    mensagemHelper.gerarMensagem.mockResolvedValue('mensagem padrão');
    emailService.enviarSemExcecao.mockResolvedValue(undefined);

    const modulo = await Test.createTestingModule({
      providers: [
        LiberarRemessasLoteBalcaoService,
        { provide: PrismaService, useValue: prisma },
        { provide: RemessaLiberadaBalcaoRepository, useValue: repository },
        { provide: LiberacaoRemessaMensagemHelper, useValue: mensagemHelper },
        { provide: LiberacaoRemessaBalcaoEmailService, useValue: emailService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = modulo.get(LiberarRemessasLoteBalcaoService);
  });

  it('envia um e-mail para cada solicitante do mesmo cliente', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, ana),
      criarRemessa(2n, 100n, bruno),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2] } as never, usuario as never);

    expect(enviosRealizados()).toEqual([
      { id: 1n, observacao: 'mensagem padrão', assunto: 'Atualização da sua remessa Nº R1' },
      { id: 2n, observacao: 'mensagem padrão', assunto: 'Atualização da sua remessa Nº R2' },
    ]);
    expect(mensagemHelper.gerarMensagem).toHaveBeenCalledWith(2n, 'Cliente 100', 'R1', null);
    expect(mensagemHelper.gerarMensagem).toHaveBeenCalledWith(2n, 'Cliente 100', 'R2', null);
  });

  it('agrupa num único e-mail as remessas do mesmo solicitante, sem diferenciar maiúsculas', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, ana),
      criarRemessa(2n, 100n, bruno),
      criarRemessa(3n, 100n, { email: 'ANA@cliente.com', nome: 'Ana' }),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2, 3] } as never, usuario as never);

    expect(enviosRealizados()).toEqual([
      { id: 1n, observacao: 'mensagem padrão', assunto: 'Atualização das suas remessas Nº R1, R3' },
      { id: 2n, observacao: 'mensagem padrão', assunto: 'Atualização da sua remessa Nº R2' },
    ]);
  });

  it('separa o mesmo solicitante quando as remessas são de clientes diferentes', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, ana),
      criarRemessa(2n, 200n, ana),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2] } as never, usuario as never);

    expect(enviosRealizados().map((envio) => envio.id)).toEqual([1n, 2n]);
    expect(mensagemHelper.gerarMensagem).toHaveBeenCalledWith(2n, 'Cliente 100', 'R1', null);
    expect(mensagemHelper.gerarMensagem).toHaveBeenCalledWith(2n, 'Cliente 200', 'R2', null);
  });

  it('remessas sem subordinado formam o grupo do solicitante do cadastro', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, null),
      criarRemessa(2n, 100n, ana),
      criarRemessa(3n, 100n, null),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2, 3] } as never, usuario as never);

    expect(enviosRealizados().map((envio) => envio.assunto)).toEqual([
      'Atualização das suas remessas Nº R1, R3',
      'Atualização da sua remessa Nº R2',
    ]);
  });

  it('remessas sem destinatário com e-mail formam um único grupo e não interrompem o lote', async () => {
    const semEmail = { email: null, nome: 'Sem e-mail' };
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, semEmail, semEmail),
      criarRemessa(2n, 100n, ana),
      criarRemessa(3n, 100n, semEmail, semEmail),
    ]);

    await expect(
      service.liberarEmLote({ remessa_ids: [1, 2, 3] } as never, usuario as never),
    ).resolves.toEqual(expect.objectContaining({ total_liberadas: 3 }));

    expect(enviosRealizados().map(({ id, assunto }) => ({ id, assunto }))).toEqual([
      { id: 1n, assunto: 'Atualização das suas remessas Nº R1, R3' },
      { id: 2n, assunto: 'Atualização da sua remessa Nº R2' },
    ]);
  });

  it('usa a observação digitada em todos os e-mails quando o lote é de um único cliente', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, ana),
      criarRemessa(2n, 100n, bruno),
    ]);

    await service.liberarEmLote(
      { remessa_ids: [1, 2], observacao: 'Retirar na recepção' } as never,
      usuario as never,
    );

    expect(mensagemHelper.gerarMensagem).not.toHaveBeenCalled();
    expect(enviosRealizados().map((envio) => envio.observacao)).toEqual([
      'Retirar na recepção',
      'Retirar na recepção',
    ]);
  });

  it('registra as liberações e atualiza o status das remessas na transação', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n, ana),
      criarRemessa(2n, 100n, bruno),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2] } as never, usuario as never);

    expect(transacao.remessaLiberadaBalcao.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ remessaId: 1n, userIdExecutor: 1n, tipoEntregaId: 2n }),
        expect.objectContaining({ remessaId: 2n, userIdExecutor: 1n, tipoEntregaId: 2n }),
      ],
    });
    expect(transacao.remessa.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1n, 2n] } },
      data: { status: 'pedido_liberado', situacao: 'pedido_liberado' },
    });
  });
});

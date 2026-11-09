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

// services de remessas (cache das listagens)
import { RemessasCacheService } from 'src/modules/remessas/services/remessas-cache.service';

// services do módulo (serviços testados e envio de e-mail)
import { LiberacaoRemessaBalcaoEmailService } from '../services/liberacao-remessa-balcao-email.service';
import { LiberarRemessasLoteBalcaoService } from '../services/liberar-remessas-lote-balcao.service';
import { RemessaLiberadaBalcaoService } from '../services/remessa-liberada-balcao.service';

/**
 * O disparo de e-mail na liberação de remessa (balcão/expedição) está desativado
 * temporariamente. Ao reativar, remover este arquivo e o `describe.skip` de
 * liberar-remessas-lote-balcao.service.spec.ts.
 */
describe('Liberação de remessa — disparo de e-mail desativado', () => {
  const transacao = {
    remessaLiberadaBalcao: { createMany: jest.fn() },
    remessa: { updateMany: jest.fn() },
  };
  const prisma = {
    remessa: { findMany: jest.fn(), findFirst: jest.fn() },
    tipoEntregaUser: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (transacaoMock: typeof transacao) => unknown) =>
      callback(transacao),
    ),
  };
  const repository = {
    findRemessaIdsLiberadas: jest.fn(),
    create: jest.fn(),
  };
  const mensagemHelper = {
    carregarEnderecosResidenciaisPorClientes: jest.fn(),
    gerarMensagem: jest.fn(),
  };
  const emailService = { enviar: jest.fn(), enviarSemExcecao: jest.fn() };
  const config = { get: jest.fn(() => 0) };
  const remessasCache = { invalidarTudo: jest.fn(), invalidarTudoDosClientes: jest.fn() };
  const usuario = { id: 1n, roles: ['expedicao'] };

  const criarRemessa = (id: bigint) => ({
    id,
    numeroRemessa: `R${id}`,
    clienteId: 100n,
    status: 'conferido',
    situacao: 'conferido',
    cliente: { nome: 'Cliente 100' },
    userIdSolicitanteRemessa: 5n,
    userIdExecutor: null,
    solicitante: { email: 'cadastro@cliente.com', nome: 'Titular' },
    usersSolicitanteSubordinadoId: null,
    solicitanteSubordinado: null,
  });

  let servicoLote: LiberarRemessasLoteBalcaoService;
  let servicoUnitario: RemessaLiberadaBalcaoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 1n, nome: 'Expedidor' });
    prisma.tipoEntregaUser.findMany.mockResolvedValue([{ clienteId: 100n, tipoEntregaId: 2n }]);
    repository.findRemessaIdsLiberadas.mockResolvedValue([]);
    repository.create.mockResolvedValue({
      id: 10n,
      remessaId: 1n,
      userIdExecutor: 1n,
      tipoEntregaId: 2n,
      observacao: null,
      outros: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mensagemHelper.carregarEnderecosResidenciaisPorClientes.mockResolvedValue(new Map());
    mensagemHelper.gerarMensagem.mockResolvedValue('mensagem padrão');

    const modulo = await Test.createTestingModule({
      providers: [
        LiberarRemessasLoteBalcaoService,
        RemessaLiberadaBalcaoService,
        { provide: PrismaService, useValue: prisma },
        { provide: RemessaLiberadaBalcaoRepository, useValue: repository },
        { provide: LiberacaoRemessaMensagemHelper, useValue: mensagemHelper },
        { provide: LiberacaoRemessaBalcaoEmailService, useValue: emailService },
        { provide: ConfigService, useValue: config },
        { provide: RemessasCacheService, useValue: remessasCache },
      ],
    }).compile();

    servicoLote = modulo.get(LiberarRemessasLoteBalcaoService);
    servicoUnitario = modulo.get(RemessaLiberadaBalcaoService);
  });

  it('libera remessa unitária sem enviar e-mail', async () => {
    prisma.remessa.findFirst.mockResolvedValue(criarRemessa(1n));

    await servicoUnitario.liberarRemessaParaBalcao(
      { remessa_id: 1, tipo_entrega_id: 2 } as never,
      usuario as never,
    );

    expect(repository.create).toHaveBeenCalled();
    expect(emailService.enviar).not.toHaveBeenCalled();
    expect(emailService.enviarSemExcecao).not.toHaveBeenCalled();
  });

  it('libera remessas em lote sem enviar e-mail', async () => {
    prisma.remessa.findMany.mockResolvedValue([criarRemessa(1n), criarRemessa(2n)]);

    await servicoLote.liberarEmLote({ remessa_ids: [1, 2] } as never, usuario as never);

    expect(transacao.remessaLiberadaBalcao.createMany).toHaveBeenCalled();
    expect(remessasCache.invalidarTudoDosClientes).toHaveBeenCalledWith([100, 100]);
    expect(emailService.enviar).not.toHaveBeenCalled();
    expect(emailService.enviarSemExcecao).not.toHaveBeenCalled();
  });
});

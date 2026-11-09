/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// services de remessas (cache das listagens)
import { RemessasCacheService } from 'src/modules/remessas/services/remessas-cache.service';

// exceptions do módulo (lote recusado na validação)
import { LoteValidacaoException } from '../exceptions/lote-validacao.exception';

// repositories do módulo (liberações já registradas no balcão e na recepção)
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';
import { RemessaLiberadaClienteRepository } from '../repositories/remessa-liberada-cliente.repository';

// services do módulo (serviço testado)
import { LiberarRemessasLoteClienteService } from '../services/liberar-remessas-lote-cliente.service';

describe('LiberarRemessasLoteClienteService — cache das listagens', () => {
  const transacao = {
    remessaLiberadaCliente: { createMany: jest.fn() },
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
  const balcaoRepository = { findRemessaIdsLiberadas: jest.fn() };
  const remessasCache = { invalidarTudoDosClientes: jest.fn() };
  let service: LiberarRemessasLoteClienteService;

  const usuario = { id: 1n, roles: ['recepcao'] };

  const criarRemessa = (id: bigint, clienteId: bigint) => ({
    id,
    numeroRemessa: `R${id}`,
    clienteId,
    status: 'pedido_liberado',
    situacao: 'pedido_liberado',
    cliente: { nome: `Cliente ${clienteId}` },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 1n, nome: 'Recepção' });
    prisma.tipoEntregaUser.findMany.mockResolvedValue([
      { clienteId: 100n, tipoEntregaId: 2n },
      { clienteId: 200n, tipoEntregaId: 2n },
    ]);
    repository.findRemessaIdsLiberadas.mockResolvedValue([]);
    balcaoRepository.findRemessaIdsLiberadas.mockResolvedValue([
      { remessaId: 1n },
      { remessaId: 2n },
      { remessaId: 3n },
    ]);

    const modulo = await Test.createTestingModule({
      providers: [
        LiberarRemessasLoteClienteService,
        { provide: PrismaService, useValue: prisma },
        { provide: RemessaLiberadaClienteRepository, useValue: repository },
        { provide: RemessaLiberadaBalcaoRepository, useValue: balcaoRepository },
        { provide: RemessasCacheService, useValue: remessasCache },
      ],
    }).compile();

    service = modulo.get(LiberarRemessasLoteClienteService);
  });

  it('invalida o cache dos clientes das remessas liberadas', async () => {
    prisma.remessa.findMany.mockResolvedValue([
      criarRemessa(1n, 100n),
      criarRemessa(2n, 100n),
      criarRemessa(3n, 200n),
    ]);

    await service.liberarEmLote({ remessa_ids: [1, 2, 3] } as never, usuario as never);

    expect(transacao.remessaLiberadaCliente.createMany).toHaveBeenCalled();
    expect(remessasCache.invalidarTudoDosClientes).toHaveBeenCalledWith([100, 100, 200]);
  });

  it('não invalida o cache quando o lote é recusado na validação', async () => {
    prisma.remessa.findMany.mockResolvedValue([]);

    await expect(
      service.liberarEmLote({ remessa_ids: [1] } as never, usuario as never),
    ).rejects.toBeInstanceOf(LoteValidacaoException);
    expect(remessasCache.invalidarTudoDosClientes).not.toHaveBeenCalled();
  });
});

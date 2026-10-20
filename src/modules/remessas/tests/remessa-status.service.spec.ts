import { RemessaStatusEtapa } from '@prisma/client';
import { RemessaStatusService } from '../services/remessa-status.service';

describe('RemessaStatusService', () => {
  const tx = { remessa: { update: jest.fn() } };
  const prisma = {
    remessa: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const repository = { exists: jest.fn(), create: jest.fn(), findByRemessaId: jest.fn() };
  const cache = { invalidarTudo: jest.fn() };
  const interno = { id: BigInt(42), tipoLogin: 'user' as const };

  let service: RemessaStatusService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RemessaStatusService(prisma as never, repository as never, cache as never);
  });

  describe('registrarStatus', () => {
    beforeEach(() => {
      prisma.remessa.findUnique.mockResolvedValue({ clienteId: BigInt(7) });
      repository.exists.mockResolvedValue(false);
    });

    it('grava o usuário interno como autor da mudança', async () => {
      await service.registrarStatus(BigInt(1), 'em_producao' as RemessaStatusEtapa, interno);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          remessaId: BigInt(1),
          status: 'em_producao',
          userId: BigInt(42),
        }),
        tx,
      );
      expect(tx.remessa.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { status: 'em_producao' },
      });
      expect(cache.invalidarTudo).toHaveBeenCalledWith(7);
    });

    it('grava autor nulo para subordinado', async () => {
      await service.registrarStatus(BigInt(1), 'conferido' as RemessaStatusEtapa, {
        id: BigInt(5),
        tipoLogin: 'subordinado',
      });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: null }), tx);
    });

    it('grava autor nulo quando não é informado', async () => {
      await service.registrarStatus(BigInt(1), 'conferido' as RemessaStatusEtapa);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: null }), tx);
    });

    it('não grava de novo um status já registrado', async () => {
      repository.exists.mockResolvedValue(true);

      await service.registrarStatus(BigInt(1), 'conferido' as RemessaStatusEtapa, interno);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(cache.invalidarTudo).not.toHaveBeenCalled();
    });

    it('não faz nada quando a remessa não existe', async () => {
      prisma.remessa.findUnique.mockResolvedValue(null);

      await service.registrarStatus(BigInt(99), 'conferido' as RemessaStatusEtapa, interno);

      expect(repository.exists).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(cache.invalidarTudo).not.toHaveBeenCalled();
    });
  });

  describe('registrarStatusTx', () => {
    beforeEach(() => {
      repository.exists.mockResolvedValue(false);
    });

    it('grava o autor e atualiza a remessa dentro da transação recebida', async () => {
      await service.registrarStatusTx(
        tx as never,
        BigInt(3),
        'envio_de_dados' as RemessaStatusEtapa,
        BigInt(9),
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ remessaId: BigInt(3), userId: BigInt(9) }),
        tx,
      );
      expect(tx.remessa.update).toHaveBeenCalledWith({
        where: { id: BigInt(3) },
        data: { status: 'envio_de_dados' },
      });
    });

    it('grava autor nulo quando não é informado', async () => {
      await service.registrarStatusTx(
        tx as never,
        BigInt(3),
        'envio_de_dados' as RemessaStatusEtapa,
      );

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: null }), tx);
    });

    it('não grava de novo um status já registrado', async () => {
      repository.exists.mockResolvedValue(true);

      await service.registrarStatusTx(
        tx as never,
        BigInt(3),
        'envio_de_dados' as RemessaStatusEtapa,
        BigInt(9),
      );

      expect(repository.create).not.toHaveBeenCalled();
      expect(tx.remessa.update).not.toHaveBeenCalled();
    });
  });
});

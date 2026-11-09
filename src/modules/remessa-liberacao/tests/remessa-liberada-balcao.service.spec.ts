/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// services de remessas (cache das listagens)
import { RemessasCacheService } from 'src/modules/remessas/services/remessas-cache.service';

// repositories do módulo (liberações no balcão)
import { RemessaLiberadaBalcaoRepository } from '../repositories/remessa-liberada-balcao.repository';

// services do módulo (serviço testado e envio de e-mail)
import { LiberacaoRemessaBalcaoEmailService } from '../services/liberacao-remessa-balcao-email.service';
import { RemessaLiberadaBalcaoService } from '../services/remessa-liberada-balcao.service';

jest.mock('../mappers/remessa-liberada.mapper', () => ({
  mapRemessaLiberadaBalcao: (registro: unknown) => registro,
}));

describe('RemessaLiberadaBalcaoService', () => {
  const prisma = {
    remessa: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const repository = { create: jest.fn() };
  const emailService = { enviar: jest.fn() };
  const remessasCache = { invalidarTudo: jest.fn() };
  let service: RemessaLiberadaBalcaoService;

  const dto = { remessa_id: 10, tipo_entrega_id: 2 };
  const usuario = { id: 7n, roles: ['expedicao'] };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.remessa.findFirst.mockResolvedValue({ id: 10n, clienteId: 3n, userIdExecutor: null });
    prisma.user.findUnique.mockResolvedValue({ id: 7n, nome: 'Expedidor' });
    repository.create.mockImplementation((data: unknown) => Promise.resolve(data));

    const modulo = await Test.createTestingModule({
      providers: [
        RemessaLiberadaBalcaoService,
        { provide: PrismaService, useValue: prisma },
        { provide: RemessaLiberadaBalcaoRepository, useValue: repository },
        { provide: LiberacaoRemessaBalcaoEmailService, useValue: emailService },
        { provide: RemessasCacheService, useValue: remessasCache },
      ],
    }).compile();

    service = modulo.get(RemessaLiberadaBalcaoService);
  });

  it('invalida o cache das listagens do cliente após liberar', async () => {
    await service.liberarRemessaParaBalcao(dto as never, usuario as never);

    expect(repository.create).toHaveBeenCalled();
    expect(remessasCache.invalidarTudo).toHaveBeenCalledWith(3);
  });

  it('não invalida o cache nem envia e-mail quando a remessa não existe', async () => {
    prisma.remessa.findFirst.mockResolvedValue(null);

    await expect(service.liberarRemessaParaBalcao(dto as never, usuario as never)).rejects.toThrow(
      'Remessa não encontrada!',
    );
    expect(remessasCache.invalidarTudo).not.toHaveBeenCalled();
    expect(emailService.enviar).not.toHaveBeenCalled();
  });

  it('envia o e-mail da liberação ao solicitante com o tipo de entrega e a observação', async () => {
    await service.liberarRemessaParaBalcao(
      { ...dto, observacao: 'Retirar no balcão' } as never,
      usuario as never,
    );

    expect(emailService.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10n }),
      { id: 7n, nome: 'Expedidor', roles: [{ nome: 'expedicao' }] },
      2n,
      'Retirar no balcão',
    );
  });
});

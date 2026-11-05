/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// shared / mail (envio e renderização de e-mails)
import { MailService } from 'src/shared/mail/mail.service';

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// shared / storage (anexos do e-mail)
import { StorageService } from 'src/shared/storage/storage.service';

// services do módulo (serviço testado)
import { LiberacaoRemessaBalcaoEmailService } from '../services/liberacao-remessa-balcao-email.service';

describe('LiberacaoRemessaBalcaoEmailService — destinatário do e-mail', () => {
  const prisma = { tipoEntrega: { findUnique: jest.fn() } };
  const mail = { render: jest.fn(() => '<html />'), send: jest.fn() };
  const storage = { exists: jest.fn(), download: jest.fn() };
  let service: LiberacaoRemessaBalcaoEmailService;

  const titular = { email: 'cadastro@cliente.com', nome: 'Titular' };
  const subordinado = { email: 'solicitante@cliente.com', nome: 'Subordinado' };
  const liberador = { id: 1n, nome: 'Expedidor', roles: [{ nome: 'expedicao' }] };

  const remessaBase = {
    id: 10n,
    numeroRemessa: '123',
    userIdSolicitanteRemessa: null,
    usersSolicitanteSubordinadoId: null,
    solicitante: null,
    solicitanteSubordinado: null,
  };

  const remessaComTitularESubordinado = {
    ...remessaBase,
    userIdSolicitanteRemessa: 5n,
    usersSolicitanteSubordinadoId: 8n,
    solicitante: titular,
    solicitanteSubordinado: subordinado,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.tipoEntrega.findUnique.mockResolvedValue({ id: 2n, tipo: 'balcao' });
    mail.send.mockResolvedValue(undefined);

    const modulo = await Test.createTestingModule({
      providers: [
        LiberacaoRemessaBalcaoEmailService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = modulo.get(LiberacaoRemessaBalcaoEmailService);
  });

  it('envia ao solicitante (user_id_solicitante_remessa) mesmo quando a remessa tem subordinado', async () => {
    await service.enviar(remessaComTitularESubordinado as never, liberador as never, 2n, '');

    expect(prisma.tipoEntrega.findUnique).toHaveBeenCalledWith({ where: { id: 2n } });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: titular.email,
        toName: titular.nome,
        subject: 'Atualização da sua remessa Nº 123',
        text: `Olá ${titular.nome}, sua remessa Nº 123 foi liberada com sucesso. Acesse o sistema para acompanhar os detalhes.`,
      }),
    );
    expect(mail.send).not.toHaveBeenCalledWith(expect.objectContaining({ to: subordinado.email }));
  });

  it('envia ao solicitante quando não há subordinado', async () => {
    const remessa = { ...remessaBase, userIdSolicitanteRemessa: 5n, solicitante: titular };

    await service.enviar(remessa as never, liberador as never, 2n, '');

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: titular.email, toName: titular.nome }),
    );
  });

  it('envia ao subordinado (users_cliente) quando não há solicitante em users', async () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: subordinado,
    };

    await service.enviar(remessa as never, liberador as never, 2n, '');

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: subordinado.email, toName: subordinado.nome }),
    );
  });

  it('usa o solicitante quando o subordinado não tem e-mail', async () => {
    const remessa = {
      ...remessaComTitularESubordinado,
      solicitanteSubordinado: { email: null, nome: 'Sem e-mail' },
    };

    await service.enviar(remessa as never, liberador as never, 2n, '');

    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: titular.email }));
  });

  it('usa "Solicitante" como nome quando o solicitante não tem nome', async () => {
    const remessa = {
      ...remessaComTitularESubordinado,
      solicitante: { email: titular.email, nome: null },
    };

    await service.enviar(remessa as never, liberador as never, 2n, '');

    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ toName: 'Solicitante' }));
  });

  it('sem solicitante com e-mail lança erro de negócio e não envia', async () => {
    await expect(service.enviar(remessaBase as never, liberador as never, 2n, '')).rejects.toThrow(
      'Remessa sem solicitante com e-mail cadastrado.',
    );
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('subordinado sem e-mail e sem solicitante lança erro de negócio e não envia', async () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: { email: null, nome: 'Sem e-mail' },
    };

    await expect(service.enviar(remessa as never, liberador as never, 2n, '')).rejects.toThrow(
      'Remessa sem solicitante com e-mail cadastrado.',
    );
    expect(mail.send).not.toHaveBeenCalled();
  });

  it.each([null, { id: 2n, tipo: 'desconhecido' }])(
    'tipo de entrega inexistente ou desconhecido (%p) lança erro de negócio',
    async (tipoEntrega) => {
      prisma.tipoEntrega.findUnique.mockResolvedValue(tipoEntrega);

      await expect(
        service.enviar(remessaComTitularESubordinado as never, liberador as never, 2n, ''),
      ).rejects.toThrow('Tipo de entrega inválido!');
      expect(mail.send).not.toHaveBeenCalled();
    },
  );

  it('falha no provedor de e-mail vira erro de negócio genérico', async () => {
    mail.send.mockRejectedValue(new Error('timeout'));

    await expect(
      service.enviar(remessaComTitularESubordinado as never, liberador as never, 2n, ''),
    ).rejects.toThrow('Erro ao enviar o e-mail da remessa!');
  });

  it('enviarSemExcecao não lança quando o provedor de e-mail falha', async () => {
    mail.send.mockRejectedValue(new Error('timeout'));

    await expect(
      service.enviarSemExcecao(remessaComTitularESubordinado as never, liberador as never, 2n, ''),
    ).resolves.toBeUndefined();
  });
});

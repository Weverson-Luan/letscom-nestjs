import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';

describe('ConversaParticipanteRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    user: { findFirst: jest.fn() },
    userCliente: { findFirst: jest.fn(), findMany: jest.fn() },
    conversaParticipante: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const repository = new ConversaParticipanteRepository(prisma as unknown as PrismaService);
  const incluirPessoa = {
    user: { select: { id: true, nome: true, email: true } },
    subordinado: { select: { id: true, nome: true, email: true } },
  };

  function sqlDaChamada(indice = 0) {
    const [template, ...valores] = prisma.$queryRaw.mock.calls[indice];
    return Prisma.sql(template, ...valores);
  }

  beforeEach(() => jest.clearAllMocks());

  it('busca a participação por users.id ou por users_cliente.id', async () => {
    await repository.buscarDaPessoa(5n, { userId: 7n });
    await repository.buscarDaPessoa(5n, { subordinadoId: 3n });

    expect(prisma.conversaParticipante.findFirst).toHaveBeenNthCalledWith(1, {
      where: { clienteId: 5n, userId: 7n },
      include: incluirPessoa,
    });
    expect(prisma.conversaParticipante.findFirst).toHaveBeenNthCalledWith(2, {
      where: { clienteId: 5n, subordinadoId: 3n },
      include: incluirPessoa,
    });
  });

  it('usa a transação quando informada', async () => {
    const tx = { conversaParticipante: { findMany: jest.fn() } };
    await repository.listarDonos(5n, tx as unknown as Prisma.TransactionClient);
    expect(tx.conversaParticipante.findMany).toHaveBeenCalledWith({
      where: { clienteId: 5n, papel: 'dono' },
      select: {
        id: true,
        userId: true,
        subordinadoId: true,
        user: { select: { ativo: true, deletedAt: true } },
      },
    });
    expect(prisma.conversaParticipante.findMany).not.toHaveBeenCalled();
  });

  it('lista donos primeiro e depois por ordem de convite', async () => {
    await repository.listar(5n);
    expect(prisma.conversaParticipante.findMany).toHaveBeenCalledWith({
      where: { clienteId: 5n },
      include: incluirPessoa,
      orderBy: [{ papel: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('destinatários: só convite aceito e cadastro ativo', async () => {
    await repository.listarAceitosAtivos(5n);
    expect(prisma.conversaParticipante.findMany).toHaveBeenCalledWith({
      where: {
        clienteId: 5n,
        status: 'aceito',
        OR: [{ user: { ativo: true, deletedAt: null } }, { subordinado: { ativo: true } }],
      },
      select: { userId: true, subordinadoId: true },
    });
  });

  it('responde o convite só se ainda estiver pendente', async () => {
    prisma.conversaParticipante.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(repository.responderConvite(60n, 'aceito')).resolves.toBe(true);
    await expect(repository.responderConvite(60n, 'recusado')).resolves.toBe(false);
    expect(prisma.conversaParticipante.updateMany).toHaveBeenCalledWith({
      where: { id: 60n, status: 'pendente' },
      data: { status: 'aceito', respondidoEm: expect.any(Date) },
    });
  });

  it('trava a linha do cliente com FOR UPDATE na transação', async () => {
    const tx = { $queryRaw: jest.fn() };
    await repository.travarConversa(5n, tx as unknown as Prisma.TransactionClient);
    const [template, ...valores] = tx.$queryRaw.mock.calls[0];
    const sql = Prisma.sql(template, ...valores);
    expect(sql.sql).toContain('FOR UPDATE');
    expect(sql.values).toEqual([5n]);
  });

  it('interno ativo: papel interno ativo, usuário ativo e não excluído', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 8n }]).mockResolvedValueOnce([]);

    await expect(repository.ehInternoAtivo(8n)).resolves.toBe(true);
    await expect(repository.ehInternoAtivo(9n)).resolves.toBe(false);

    const sql = sqlDaChamada();
    expect(sql.sql).toContain('u.ativo = 1');
    expect(sql.sql).toContain('u.deleted_at IS NULL');
    expect(sql.values).toEqual([8n, 'admin', 'consultor', 'producao', 'recepcao']);
  });

  it('subordinado só conta se for do mesmo cliente e ativo', async () => {
    prisma.userCliente.findFirst.mockResolvedValue(null);
    await expect(repository.ehSubordinadoAtivoDoCliente(5n, 3n)).resolves.toBe(false);
    expect(prisma.userCliente.findFirst).toHaveBeenCalledWith({
      where: { id: 3n, clienteId: 5n, ativo: true },
      select: { id: true },
    });
  });

  it('candidatos internos: exclui o cliente, quem já participa ou tem convite pendente, e escapa a busca', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await repository.listarCandidatosInternos({ clienteId: 5n, search: '50%_', take: 50 });

    const sql = sqlDaChamada();
    expect(sql.sql).toContain("p.status IN ('pendente', 'aceito')");
    expect(sql.values).toEqual(
      expect.arrayContaining([5n, '%50\\%\\_%', 50, 'admin', 'consultor', 'producao', 'recepcao']),
    );
  });

  it('candidatos do lado do cliente: principal primeiro, depois subordinados, respeitando o limite', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 5n, nome: 'Empresa X', email: 'x@x.com' });
    prisma.userCliente.findMany.mockResolvedValue([
      { id: 3n, nome: 'Compras', email: 'c@x.com' },
      { id: 4n, nome: 'Financeiro', email: 'f@x.com' },
    ]);

    const resultado = await repository.listarCandidatosLadoCliente({ clienteId: 5n, take: 2 });

    expect(resultado).toEqual([
      { user_id: 5n, subordinado_id: null, nome: 'Empresa X', email: 'x@x.com' },
      { user_id: null, subordinado_id: 3n, nome: 'Compras', email: 'c@x.com' },
    ]);
    const filtroOcupados = {
      none: { clienteId: 5n, status: { in: ['pendente', 'aceito'] } },
    };
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 5n, conversasParticipante: filtroOcupados }),
      }),
    );
    expect(prisma.userCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clienteId: 5n, ativo: true, conversasParticipante: filtroOcupados },
        take: 2,
      }),
    );
  });

  it('candidatos do lado do cliente aplicam a busca por nome/e-mail', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.userCliente.findMany.mockResolvedValue([]);

    await repository.listarCandidatosLadoCliente({ clienteId: 5n, search: 'fin', take: 50 });

    expect(prisma.userCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ nome: { contains: 'fin' } }, { email: { contains: 'fin' } }],
        }),
      }),
    );
  });

  it('remove o participante pelo id', async () => {
    await repository.remover(61n);
    expect(prisma.conversaParticipante.delete).toHaveBeenCalledWith({ where: { id: 61n } });
  });
});

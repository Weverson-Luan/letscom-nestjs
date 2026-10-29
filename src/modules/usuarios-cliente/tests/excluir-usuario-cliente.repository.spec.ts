/**
 * IMPORTS
 */

// shared / prisma (conexão com o banco)
import { PrismaService } from 'src/shared/prisma/prisma.service';

// repositories
import { ExcluirUsuarioClienteRepository } from '../repositories/excluir-usuario-cliente.repository';

describe('ExcluirUsuarioClienteRepository', () => {
  const prisma = {
    userCliente: { delete: jest.fn() },
    remessa: { count: jest.fn() },
  };
  const repository = new ExcluirUsuarioClienteRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('conta as remessas solicitadas pelo subordinado', async () => {
    await repository.contarRemessasDoSubordinado(4n);

    expect(prisma.remessa.count).toHaveBeenCalledWith({
      where: { usersSolicitanteSubordinadoId: 4n },
    });
  });

  it('exclui fisicamente o usuário', async () => {
    await repository.excluir(4n);

    expect(prisma.userCliente.delete).toHaveBeenCalledWith({ where: { id: 4n } });
  });
});

/**
 * IMPORTS
 */

// mappers
import { PrismaService } from 'src/shared/prisma/prisma.service';

// mappers
import { serializeUser } from '../../mappers/auth-response.mapper';

/** buscar o primeiro consultor vinculado ao cliente. */
async function getClientConsultantMappers(prisma: PrismaService, clienteId: bigint) {
  const vinculo = await prisma.clienteConsultor.findFirst({
    where: { clienteId },
    include: { consultor: true },
    orderBy: { id: 'asc' },
  });

  return serializeUser(vinculo?.consultor ?? null);
}

/**
 * EXPORTS
 */
export { getClientConsultantMappers };

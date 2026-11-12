/**
 * IMPORTS
 */
// repositories (repository testado)
import {
  LIMITE_LISTAGEM_LIBERACOES_BALCAO,
  RemessaLiberadaBalcaoRepository,
} from '../repositories/remessa-liberada-balcao.repository';

describe('RemessaLiberadaBalcaoRepository', () => {
  it('findAll lista as liberações mais recentes limitadas ao teto defensivo', async () => {
    const buscarVarios = jest.fn().mockResolvedValue([]);
    const repositorio = new RemessaLiberadaBalcaoRepository({
      remessaLiberadaBalcao: { findMany: buscarVarios },
    } as never);

    await repositorio.findAll();

    expect(buscarVarios).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { id: 'desc' }, take: LIMITE_LISTAGEM_LIBERACOES_BALCAO }),
    );
  });
});

import { RemessasResponseMapper } from '../mappers/remessas-response.mapper';

/**
 * Cobre a serialização do modelo técnico nas listagens de remessa: o front lê
 * `modelo_tecnico.nome_modelo` (snake_case), e o objeto cru do Prisma
 * (`nomeModelo`) fazia a tela de remessa mostrar "N/A".
 */
describe('RemessasResponseMapper — modelo técnico da remessa', () => {
  const prisma = {
    remessaLiberadaBalcao: { findMany: jest.fn().mockResolvedValue([]) },
    tipoEntregaUser: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const storage = {
    getSignedUrl: jest.fn(async (path: string) => `https://cdn.test/${path}`),
  };
  let mapper: RemessasResponseMapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mapper = new RemessasResponseMapper(prisma as never, storage as never);
  });

  function remessaCom(modeloTecnico: unknown) {
    return {
      id: 1n,
      clienteId: 5n,
      totalSolicitacoes: 10,
      status: 'em_producao',
      createdAt: new Date('2026-10-20T12:00:00Z'),
      updatedAt: new Date('2026-10-20T12:00:00Z'),
      numeroRemessa: 52647n,
      statusLogs: [],
      modeloTecnico,
    };
  }

  it('devolve o modelo em snake_case com o nome e as URLs das fotos', async () => {
    const modelo = {
      id: 685n,
      clienteId: 5n,
      produtoId: 2n,
      tecnologiaId: 3n,
      nomeModelo: 'Carteirinha Estudante',
      posicionamento: 'vertical',
      temFuro: true,
      temCargaFoto: true,
      temDadosVariaveis: false,
      isProvisorio: false,
      ativo: true,
      tipoFuro: 'oblongo',
      campoChave: 'matricula',
      fotoFrentePath: 'homologacao/modelos/frente/a.png',
      fotoVersoPath: null,
      observacoes: null,
      createdAt: null,
      updatedAt: null,
      camposVariaveis: [
        { id: 2n, modeloTecnicoId: 685n, nome: 'curso', obrigatorio: false, ordem: 2 },
        { id: 1n, modeloTecnicoId: 685n, nome: 'nome', obrigatorio: true, ordem: 1 },
      ],
    };

    const [item] = await mapper.mapRemessas([remessaCom(modelo)]);

    expect(item.modelo_tecnico).toMatchObject({
      id: 685n,
      nome_modelo: 'Carteirinha Estudante',
      tem_furo: true,
      tem_carga_foto: true,
      tem_dados_variaveis: false,
      tipo_furo: 'oblongo',
      foto_frente_url: 'https://cdn.test/homologacao/modelos/frente/a.png',
      foto_verso_url: null,
    });
    expect(item.modelo_tecnico).not.toHaveProperty('nomeModelo');
    expect(item.modelo_tecnico.campos_variaveis.map((c: { nome: string }) => c.nome)).toEqual([
      'nome',
      'curso',
    ]);
    expect(storage.getSignedUrl).toHaveBeenCalledTimes(1);
    expect(modelo).not.toHaveProperty('foto_frente_url');
  });

  it('assina a foto do verso e devolve campos variáveis vazios quando não vieram', async () => {
    const modelo = {
      id: 7n,
      nomeModelo: 'Crachá',
      fotoFrentePath: 'homologacao/modelos/frente/f.png',
      fotoVersoPath: 'homologacao/modelos/verso/v.png',
    };

    const [item] = await mapper.mapRemessas([remessaCom(modelo)]);

    expect(item.modelo_tecnico.foto_verso_url).toBe(
      'https://cdn.test/homologacao/modelos/verso/v.png',
    );
    expect(item.modelo_tecnico.campos_variaveis).toEqual([]);
    expect(storage.getSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('devolve modelo_tecnico nulo quando a remessa não tem modelo', async () => {
    const [item] = await mapper.mapRemessas([remessaCom(null)]);

    expect(item.modelo_tecnico).toBeNull();
    expect(item.is_provisorio).toBe(false);
  });
});

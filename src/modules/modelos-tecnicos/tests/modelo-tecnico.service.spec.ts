import { BusinessException } from 'src/shared/exceptions/business.exception';
import { ModeloTecnicoService } from '../services/modelo-tecnico.service';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), randomUUID: () => 'uuid-fixo' }));

describe('ModeloTecnicoService — fotos na pasta raiz do storage', () => {
  const repository = { create: jest.fn(), update: jest.fn() };
  const storage = {
    put: jest.fn(),
    delete: jest.fn(),
    montarCaminho: jest.fn((relativo: string) => `homologacao/${relativo}`),
  };
  let service: ModeloTecnicoService;

  const dto = {
    cliente_id: 1,
    produto_id: 2,
    tecnologia_id: 3,
    nome_modelo: 'Crachá',
    campo_chave: 'matricula',
    posicionamento: 'v',
  };
  const foto = (originalname: string) => ({
    buffer: Buffer.from(originalname),
    originalname,
    mimetype: 'image/png',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ModeloTecnicoService(
      repository as never,
      {} as never,
      storage as never,
      {} as never,
    );
    jest.spyOn(service as never, 'validarFks').mockResolvedValue(undefined as never);
    repository.create.mockResolvedValue({ id: 1n });
  });

  it('grava frente e verso dentro da pasta raiz e persiste os mesmos caminhos', async () => {
    const frente = foto('frente.png');
    const verso = foto('verso.png');

    await service.criar(dto as never, frente, verso);

    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/modelos/frente/uuid-fixo.png',
      frente.buffer,
    );
    expect(storage.put).toHaveBeenCalledWith(
      'homologacao/modelos/verso/uuid-fixo.png',
      verso.buffer,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fotoFrentePath: 'homologacao/modelos/frente/uuid-fixo.png',
        fotoVersoPath: 'homologacao/modelos/verso/uuid-fixo.png',
      }),
    );
  });

  it('cria modelo sem planilha (provisório) com campo chave null', async () => {
    await service.criar({ ...dto, campo_chave: null } as never, foto('f.png'), foto('v.png'));

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ campoChave: null }));
  });

  it.each([
    ['carga de foto', { tem_carga_foto: true }],
    ['dados variáveis', { tem_dados_variaveis: true }],
  ])('recusa criar modelo com %s sem campo chave', async (_caso, flags) => {
    await expect(
      service.criar({ ...dto, ...flags, campo_chave: null } as never, foto('f.png'), foto('v.png')),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(storage.put).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  describe('atualizar', () => {
    const atual = {
      id: 1n,
      clienteId: 1n,
      produtoId: 2n,
      tecnologiaId: 3n,
      campoChave: 'undefined',
      temCargaFoto: false,
      temDadosVariaveis: true,
    };

    beforeEach(() => {
      jest.spyOn(service, 'buscar').mockResolvedValue(atual as never);
      repository.update.mockResolvedValue({ id: 1n });
    });

    it('não trava a edição de outros campos em modelo antigo sem campo chave', async () => {
      await service.atualizar(1n, { nome_modelo: 'Novo' } as never);

      expect(repository.update).toHaveBeenCalledWith(1n, { nomeModelo: 'Novo' });
    });

    it('recusa limpar o campo chave de modelo com dados variáveis', async () => {
      await expect(service.atualizar(1n, { campo_chave: null } as never)).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('limpa o campo chave quando o modelo deixa de usar planilha', async () => {
      await service.atualizar(1n, { campo_chave: null, tem_dados_variaveis: false } as never);

      expect(repository.update).toHaveBeenCalledWith(1n, {
        campoChave: null,
        temDadosVariaveis: false,
      });
    });
  });
});

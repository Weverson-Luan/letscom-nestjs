import { Test } from '@nestjs/testing';
import { AnotacaoClienteInvalidaException } from '../exceptions/anotacao-cliente-invalida.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { AnotacaoRegistroService } from '../services/anotacao-registro.service';
import { CriarAnotacaoClienteService } from '../services/criar-anotacao-cliente.service';
import { criarAnotacaoFake, criarArquivoFake, criarUsuarioLogadoFake } from './fixtures';

describe('CriarAnotacaoClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn() };
  const registro = { registrar: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  let service: CriarAnotacaoClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarAnotacaoClienteService,
        { provide: ClienteAnotacaoRepository, useValue: repository },
        { provide: AnotacaoRegistroService, useValue: registro },
      ],
    }).compile();
    service = moduleRef.get(CriarAnotacaoClienteService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    registro.registrar.mockResolvedValue(criarAnotacaoFake());
  });

  it('registra como autor interno com tipo padrão nota', async () => {
    const arquivo = criarArquivoFake();

    const resultado = await service.execute(5n, { conteudo: 'Ligou' }, [arquivo], usuario);

    expect(registro.registrar).toHaveBeenCalledWith({
      clienteId: 5n,
      autor: { tipo: 'interno', userId: 7n, nome: 'Operador' },
      tipo: 'nota',
      conteudo: 'Ligou',
      arquivos: [arquivo],
    });
    expect(resultado).toMatchObject({ id: 30n, eh_minha: true, pode_editar: true });
  });

  it('respeita o tipo informado e usa o e-mail quando o usuário não tem nome', async () => {
    await service.execute(
      5n,
      { conteudo: 'x', tipo: 'reuniao' },
      [],
      criarUsuarioLogadoFake({ nome: null }),
    );

    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'reuniao',
        autor: { tipo: 'interno', userId: 7n, nome: 'operador@letscom.com' },
      }),
    );
  });

  it('recusa anotação vazia antes de consultar o banco', async () => {
    await expect(service.execute(5n, { conteudo: '  ' }, [], usuario)).rejects.toBeInstanceOf(
      AnotacaoClienteInvalidaException,
    );
    expect(repository.ehClienteAtivo).not.toHaveBeenCalled();
  });

  it('recusa anexo inválido antes de consultar o banco', async () => {
    await expect(
      service.execute(5n, {}, [criarArquivoFake({ originalname: 'a.exe' })], usuario),
    ).rejects.toBeInstanceOf(AnotacaoClienteInvalidaException);
    expect(repository.ehClienteAtivo).not.toHaveBeenCalled();
  });

  it('lança 404 quando o cliente não existe', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, { conteudo: 'x' }, [], usuario)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });
});

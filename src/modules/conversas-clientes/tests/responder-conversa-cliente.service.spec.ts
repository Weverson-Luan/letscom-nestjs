import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaNaoIniciadaException } from '../exceptions/conversa-nao-iniciada.exception';
import { MensagemConversaInvalidaException } from '../exceptions/mensagem-conversa-invalida.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { MensagemRegistroService } from '../services/mensagem-registro.service';
import { ResponderConversaClienteService } from '../services/responder-conversa-cliente.service';
import { criarMensagemFake, criarArquivoFake, criarUsuarioLogadoFake } from './fixtures';

describe('ResponderConversaClienteService', () => {
  const repository = { ehClienteAtivo: jest.fn() };
  const registro = { registrar: jest.fn() };
  const acesso = { garantirAcesso: jest.fn() };
  let service: ResponderConversaClienteService;

  const cliente = criarUsuarioLogadoFake({ id: 5n, nome: 'Empresa X', roles: ['cliente'] });
  const subordinado = criarUsuarioLogadoFake({
    id: 3n,
    nome: 'Compras',
    tipoLogin: 'subordinado',
    clienteId: 5n,
    roles: ['subordinado'],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResponderConversaClienteService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: MensagemRegistroService, useValue: registro },
      ],
    }).compile();
    service = moduleRef.get(ResponderConversaClienteService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.ehClienteAtivo.mockResolvedValue(true);
    registro.registrar.mockResolvedValue(
      criarMensagemFake({
        autorId: 5n,
        autorTipo: 'cliente',
        autor: { id: 5n, nome: 'Empresa X' },
      }),
    );
  });

  it('cliente principal responde na conversa da própria empresa', async () => {
    const resultado = await service.execute({ conteudo: 'Aprovado' }, [], cliente);

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(registro.registrar).toHaveBeenCalledWith({
      clienteId: 5n,
      autor: { tipo: 'cliente', userId: 5n, nome: 'Empresa X' },
      conteudo: 'Aprovado',
      arquivos: [],
    });
    expect(resultado).toMatchObject({ eh_minha: true, pode_editar: false, pode_excluir: false });
  });

  it('subordinado responde na conversa do cliente principal dele', async () => {
    await service.execute({ conteudo: 'Ok' }, [], subordinado);

    expect(repository.ehClienteAtivo).toHaveBeenCalledWith(5n);
    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 5n,
        autor: { tipo: 'subordinado', subordinadoId: 3n, nome: 'Compras' },
      }),
    );
  });

  it('recusa mensagem vazia', async () => {
    await expect(service.execute({ conteudo: '' }, [], cliente)).rejects.toBeInstanceOf(
      MensagemConversaInvalidaException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('lança 404 quando a empresa está inativa ou o subordinado não tem cliente', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);
    await expect(service.execute({ conteudo: 'x' }, [], cliente)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );

    await expect(
      service.execute({ conteudo: 'x' }, [], { ...subordinado, clienteId: null }),
    ).rejects.toBeInstanceOf(ClienteNaoEncontradoException);
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('lança 403 para quem do lado do cliente não participa', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute({ conteudo: 'x' }, [], subordinado)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('lança 409 quando a equipe ainda não iniciou a conversa', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: false,
      semDonoInterno: true,
    });

    await expect(service.execute({ conteudo: 'x' }, [], cliente)).rejects.toBeInstanceOf(
      ConversaNaoIniciadaException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('grava o nome do anexo com acento corrigido (multipart chega como latin1)', async () => {
    const arquivo = criarArquivoFake({
      originalname: Buffer.from('orçamento.pdf', 'utf8').toString('latin1'),
    });

    await service.execute({ conteudo: 'x' }, [arquivo], cliente);

    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        arquivos: [expect.objectContaining({ originalname: 'orçamento.pdf' })],
      }),
    );
  });
});

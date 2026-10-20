import { Test } from '@nestjs/testing';
import { MensagemConversaInvalidaException } from '../exceptions/mensagem-conversa-invalida.exception';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { MensagemRegistroService } from '../services/mensagem-registro.service';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { CriarMensagemConversaService } from '../services/criar-mensagem-conversa.service';
import {
  criarMensagemFake,
  criarArquivoFake,
  criarDonoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('CriarMensagemConversaService', () => {
  const tx = { marcador: 'tx' };
  const repository = { ehClienteAtivo: jest.fn() };
  const participanteRepository = {
    ehSubordinadoAtivoDoCliente: jest.fn(),
    travarConversa: jest.fn(),
    listarDonos: jest.fn(),
    buscarDaPessoa: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
  };
  const acesso = { garantirAcesso: jest.fn() };
  const registro = { registrar: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  let service: CriarMensagemConversaService;

  /** Executa o gancho `antesDeGravar` que o service passou ao registro. */
  async function rodarGancho() {
    const { antesDeGravar } = registro.registrar.mock.calls[0][0];
    await antesDeGravar(tx);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarMensagemConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaParticipanteRepository, useValue: participanteRepository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: MensagemRegistroService, useValue: registro },
      ],
    }).compile();
    service = moduleRef.get(CriarMensagemConversaService);
    repository.ehClienteAtivo.mockResolvedValue(true);
    acesso.garantirAcesso.mockResolvedValue({
      participante: { status: 'aceito' },
      iniciada: true,
      semDonoInterno: false,
    });
    participanteRepository.listarDonos.mockResolvedValue([]);
    participanteRepository.buscarDaPessoa.mockResolvedValue(null);
    participanteRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(true);
    registro.registrar.mockResolvedValue(criarMensagemFake());
  });

  it('participante registra como autor interno, sem gancho de início', async () => {
    const arquivo = criarArquivoFake();

    const resultado = await service.execute(5n, { conteudo: 'Ligou' }, [arquivo], usuario);

    expect(acesso.garantirAcesso).toHaveBeenCalledWith(5n, usuario);
    expect(registro.registrar).toHaveBeenCalledWith({
      clienteId: 5n,
      autor: { tipo: 'interno', userId: 7n, nome: 'Operador' },
      conteudo: 'Ligou',
      arquivos: [arquivo],
      antesDeGravar: undefined,
    });
    expect(resultado).toMatchObject({ id: 30n, eh_minha: true, pode_editar: true });
  });

  it('usa o e-mail quando o usuário não tem nome', async () => {
    await service.execute(5n, { conteudo: 'x' }, [], criarUsuarioLogadoFake({ nome: null }));

    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        autor: { tipo: 'interno', userId: 7n, nome: 'operador@letscom.com' },
      }),
    );
  });

  it('inicia a conversa com o cliente principal: operador e principal viram donos', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: false,
      semDonoInterno: true,
    });

    await service.execute(5n, { conteudo: 'Olá' }, [], usuario);
    await rodarGancho();

    expect(participanteRepository.travarConversa).toHaveBeenCalledWith(5n, tx);
    expect(participanteRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 5n,
        userId: 7n,
        subordinadoId: null,
        papel: 'dono',
        status: 'aceito',
      }),
      tx,
    );
    expect(participanteRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 5n,
        userId: 5n,
        subordinadoId: null,
        papel: 'dono',
        status: 'aceito',
      }),
      tx,
    );
  });

  it('inicia a conversa com o subordinado escolhido', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: false,
      semDonoInterno: true,
    });

    await service.execute(5n, { conteudo: 'Olá', subordinado_id: 3 }, [], usuario);
    await rodarGancho();

    expect(participanteRepository.ehSubordinadoAtivoDoCliente).toHaveBeenCalledWith(5n, 3n);
    expect(participanteRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, subordinadoId: 3n, papel: 'dono' }),
      tx,
    );
  });

  it('promove a dono quem já tinha linha de participante (ex.: convite recusado)', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: false,
      semDonoInterno: true,
    });
    participanteRepository.buscarDaPessoa.mockResolvedValueOnce({ id: 12n });

    await service.execute(5n, { conteudo: 'Olá' }, [], usuario);
    await rodarGancho();

    expect(participanteRepository.atualizar).toHaveBeenCalledWith(
      12n,
      expect.objectContaining({ papel: 'dono', status: 'aceito' }),
      tx,
    );
  });

  it('recusa subordinado que não é do cliente', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: false,
      semDonoInterno: true,
    });
    participanteRepository.ehSubordinadoAtivoDoCliente.mockResolvedValue(false);

    await expect(
      service.execute(5n, { conteudo: 'Olá', subordinado_id: 99 }, [], usuario),
    ).rejects.toBeInstanceOf(ParticipanteConversaInvalidoException);
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('conversa sem dono interno (legado): só completa o dono interno', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: true,
    });
    participanteRepository.listarDonos.mockResolvedValue([
      criarDonoFake({ userId: null, subordinadoId: 3n, user: null }),
    ]);

    await service.execute(5n, { conteudo: 'Olá' }, [], usuario);
    await rodarGancho();

    expect(participanteRepository.criar).toHaveBeenCalledTimes(1);
    expect(participanteRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7n, papel: 'dono' }),
      tx,
    );
  });

  it('outro operador iniciou ao mesmo tempo: revalida o acesso na transação e não vira dono', async () => {
    acesso.garantirAcesso
      .mockResolvedValueOnce({ participante: null, iniciada: false, semDonoInterno: true })
      .mockRejectedValueOnce(new SemAcessoConversaException());
    participanteRepository.listarDonos.mockResolvedValue([
      criarDonoFake({ userId: 8n }),
      criarDonoFake({ id: 2n, userId: 5n }),
    ]);

    await service.execute(5n, { conteudo: 'Olá' }, [], usuario);
    await expect(rodarGancho()).rejects.toBeInstanceOf(SemAcessoConversaException);
    expect(acesso.garantirAcesso).toHaveBeenLastCalledWith(5n, usuario, tx);
    expect(participanteRepository.criar).not.toHaveBeenCalled();
  });

  it('sem acesso à conversa: 403 sem registrar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, { conteudo: 'x' }, [], usuario)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('recusa mensagem vazia antes de consultar o banco', async () => {
    await expect(service.execute(5n, { conteudo: '  ' }, [], usuario)).rejects.toBeInstanceOf(
      MensagemConversaInvalidaException,
    );
    expect(repository.ehClienteAtivo).not.toHaveBeenCalled();
  });

  it('recusa anexo inválido antes de consultar o banco', async () => {
    await expect(
      service.execute(5n, {}, [criarArquivoFake({ originalname: 'a.exe' })], usuario),
    ).rejects.toBeInstanceOf(MensagemConversaInvalidaException);
    expect(repository.ehClienteAtivo).not.toHaveBeenCalled();
  });

  it('lança 404 quando o cliente não existe', async () => {
    repository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(5n, { conteudo: 'x' }, [], usuario)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(registro.registrar).not.toHaveBeenCalled();
  });

  it('operador dono desativado: quem escreve assume como dono interno', async () => {
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: true,
    });
    participanteRepository.listarDonos.mockResolvedValue([
      criarDonoFake({ userId: 8n, user: { ativo: false, deletedAt: null } }),
      criarDonoFake({ id: 2n, userId: 5n }),
    ]);

    await service.execute(5n, { conteudo: 'Olá' }, [], usuario);
    await rodarGancho();

    expect(acesso.garantirAcesso).toHaveBeenCalledTimes(1);
    expect(participanteRepository.criar).toHaveBeenCalledTimes(1);
    expect(participanteRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7n, papel: 'dono', status: 'aceito' }),
      tx,
    );
  });

  it('grava o nome do anexo com acento corrigido (multipart chega como latin1)', async () => {
    const arquivo = criarArquivoFake({
      originalname: Buffer.from('orçamento.pdf', 'utf8').toString('latin1'),
    });

    await service.execute(5n, { conteudo: 'x' }, [arquivo], usuario);

    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        arquivos: [expect.objectContaining({ originalname: 'orçamento.pdf' })],
      }),
    );
  });
});

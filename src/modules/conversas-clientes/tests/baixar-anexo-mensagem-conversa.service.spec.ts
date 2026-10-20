import { Test } from '@nestjs/testing';
import { SemAcessoConversaException } from '../exceptions/sem-acesso-conversa.exception';
import { StorageService } from 'src/shared/storage/storage.service';
import { AnexoMensagemNaoEncontradoException } from '../exceptions/anexo-mensagem-nao-encontrado.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaAcessoService } from '../services/conversa-acesso.service';
import { BaixarAnexoMensagemConversaService } from '../services/baixar-anexo-mensagem-conversa.service';
import { criarAnexoFake, criarParticipanteFake, criarUsuarioLogadoFake } from './fixtures';

describe('BaixarAnexoMensagemConversaService', () => {
  const repository = { buscarAnexo: jest.fn() };
  const storage = { download: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  const acesso = { garantirAcesso: jest.fn() };
  let service: BaixarAnexoMensagemConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BaixarAnexoMensagemConversaService,
        { provide: ConversaMensagemRepository, useValue: repository },
        { provide: ConversaAcessoService, useValue: acesso },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(BaixarAnexoMensagemConversaService);
    acesso.garantirAcesso.mockResolvedValue({
      participante: null,
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarAnexo.mockResolvedValue(criarAnexoFake());
    storage.download.mockResolvedValue(Buffer.from('pdf'));
  });

  it('devolve o conteúdo do storage com nome e tipo do anexo', async () => {
    const resultado = await service.execute(5n, 30n, 40n, usuario);

    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n, null);
    expect(storage.download).toHaveBeenCalledWith('clientes/5/conversa/mensagens/uuid.pdf');
    expect(resultado).toEqual({
      conteudo: Buffer.from('pdf'),
      disposicao: expect.stringContaining("filename*=UTF-8''or%C3%A7amento.pdf"),
      mimeType: 'application/pdf',
    });
  });

  it('usa octet-stream quando o mime type não foi gravado', async () => {
    repository.buscarAnexo.mockResolvedValue({ ...criarAnexoFake(), mimeType: null });

    await expect(service.execute(5n, 30n, 40n, usuario)).resolves.toMatchObject({
      mimeType: 'application/octet-stream',
    });
  });

  it('lança 404 quando o anexo não pertence à mensagem/cliente', async () => {
    repository.buscarAnexo.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      AnexoMensagemNaoEncontradoException,
    );
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('lança 404 quando o arquivo sumiu do storage', async () => {
    storage.download.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      AnexoMensagemNaoEncontradoException,
    );
  });

  it('lança 403 para quem não participa, sem baixar', async () => {
    acesso.garantirAcesso.mockRejectedValue(new SemAcessoConversaException());

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      SemAcessoConversaException,
    );
    expect(acesso.garantirAcesso).toHaveBeenCalledWith(5n, usuario);
    expect(repository.buscarAnexo).not.toHaveBeenCalled();
  });

  it('convidado não baixa anexo de mensagem anterior à entrada (busca com o corte)', async () => {
    const aceitouEm = new Date('2026-10-15T09:00:00.000Z');
    acesso.garantirAcesso.mockResolvedValue({
      participante: criarParticipanteFake({ papel: 'convidado', respondidoEm: aceitouEm }),
      iniciada: true,
      semDonoInterno: false,
    });
    repository.buscarAnexo.mockResolvedValue(null);

    await expect(service.execute(5n, 30n, 40n, usuario)).rejects.toBeInstanceOf(
      AnexoMensagemNaoEncontradoException,
    );
    expect(repository.buscarAnexo).toHaveBeenCalledWith(5n, 30n, 40n, aceitouEm);
  });
});

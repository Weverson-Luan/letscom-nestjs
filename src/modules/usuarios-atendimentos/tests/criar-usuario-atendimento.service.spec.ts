/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';

// exceptions
import { UsuarioDonoNaoEncontradoException } from '../exceptions/usuario-dono-nao-encontrado.exception';

// repositories
import { CriarUsuarioAtendimentoRepository } from '../repositories/criar-usuario-atendimento.repository';

// services
import { CriarUsuarioAtendimentoService } from '../services/criar-usuario-atendimento.service';

describe('CriarUsuarioAtendimentoService', () => {
  let service: CriarUsuarioAtendimentoService;
  const repository = { buscarUsuarioNaoExcluido: jest.fn(), criar: jest.fn() };

  const dados = { user_id: 7, email: 'atendimento@empresa.com', telefone: '11999999999' };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.buscarUsuarioNaoExcluido.mockResolvedValue({ id: 7n });
    repository.criar.mockResolvedValue({ id: 1n, userId: 7n, email: dados.email });
    const moduleRef = await Test.createTestingModule({
      providers: [
        CriarUsuarioAtendimentoService,
        { provide: CriarUsuarioAtendimentoRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(CriarUsuarioAtendimentoService);
  });

  it('cria vinculado ao usuário, com nome/documento nulos e ativo por padrão', async () => {
    const resultado = await service.execute(dados);

    expect(repository.buscarUsuarioNaoExcluido).toHaveBeenCalledWith(7n);
    expect(repository.criar).toHaveBeenCalledWith({
      user: { connect: { id: 7n } },
      nome: null,
      email: 'atendimento@empresa.com',
      telefone: '11999999999',
      documento: null,
      ativo: true,
    });
    expect(resultado).toEqual(expect.objectContaining({ id: 1n, user_id: 7n }));
  });

  it('respeita ativo false e os campos opcionais enviados', async () => {
    await service.execute({ ...dados, nome: 'Atendente', documento: '123', ativo: false });

    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Atendente', documento: '123', ativo: false }),
    );
  });

  it('lança 404 quando o usuário não existe ou foi excluído', async () => {
    repository.buscarUsuarioNaoExcluido.mockResolvedValue(null);

    await expect(service.execute(dados)).rejects.toThrow(UsuarioDonoNaoEncontradoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });
});

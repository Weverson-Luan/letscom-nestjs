import { Test } from '@nestjs/testing';
import { ClienteNaoEncontradoException } from '../exceptions/cliente-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ClienteAnotacaoRepository } from '../repositories/cliente-anotacao.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ListarCandidatosConviteConversaService } from '../services/listar-candidatos-convite-conversa.service';
import {
  criarDonoFake,
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('ListarCandidatosConviteConversaService', () => {
  const repository = {
    listarCandidatosLadoCliente: jest.fn(),
    listarCandidatosInternos: jest.fn(),
    listarDonos: jest.fn(),
    buscarDaPessoa: jest.fn(),
  };
  const anotacaoRepository = { ehClienteAtivo: jest.fn() };
  const usuario = criarUsuarioLogadoFake();
  const subordinado = criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n, clienteId: 5n });
  let service: ListarCandidatosConviteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListarCandidatosConviteConversaService,
        { provide: ConversaParticipanteRepository, useValue: repository },
        { provide: ClienteAnotacaoRepository, useValue: anotacaoRepository },
      ],
    }).compile();
    service = moduleRef.get(ListarCandidatosConviteConversaService);
    anotacaoRepository.ehClienteAtivo.mockResolvedValue(true);
    repository.listarDonos.mockResolvedValue([criarDonoFake()]);
    repository.listarCandidatosLadoCliente.mockResolvedValue([
      { user_id: 5n, subordinado_id: null, nome: 'Empresa X', email: 'x@x.com' },
      { user_id: null, subordinado_id: 4n, nome: 'Financeiro', email: 'fin@x.com' },
    ]);
    repository.listarCandidatosInternos.mockResolvedValue([
      { user_id: 8n, subordinado_id: null, nome: 'Produção', email: 'prod@letscom.com' },
    ]);
  });

  it('operador dono vê o lado do cliente e a equipe, com a busca aparada', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake());

    const resultado = await service.execute(5n, '  fin ', usuario);

    const params = { clienteId: 5n, search: 'fin', take: 50 };
    expect(repository.listarCandidatosLadoCliente).toHaveBeenCalledWith(params);
    expect(repository.listarCandidatosInternos).toHaveBeenCalledWith(params);
    expect(resultado.map((candidato) => candidato.tipo)).toEqual([
      'cliente',
      'subordinado',
      'interno',
    ]);
  });

  it('dono do lado do cliente vê só a própria empresa', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteSubordinadoFake());

    const resultado = await service.execute(5n, undefined, subordinado);

    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { subordinadoId: 3n });
    expect(repository.listarCandidatosInternos).not.toHaveBeenCalled();
    expect(resultado).toHaveLength(2);
  });

  it('antes de iniciada, a equipe vê o lado do cliente para escolher com quem iniciar', async () => {
    repository.listarDonos.mockResolvedValue([]);

    const resultado = await service.execute(5n, undefined, usuario);

    expect(repository.buscarDaPessoa).not.toHaveBeenCalled();
    expect(repository.listarCandidatosInternos).not.toHaveBeenCalled();
    expect(resultado.map((candidato) => candidato.tipo)).toEqual(['cliente', 'subordinado']);
  });

  it('antes de iniciada, o lado do cliente continua precisando ser dono', async () => {
    repository.listarDonos.mockResolvedValue([]);
    repository.buscarDaPessoa.mockResolvedValue(null);

    await expect(service.execute(5n, undefined, subordinado)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
  });

  it('quem não é dono leva 403', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake({ papel: 'convidado' }));

    await expect(service.execute(5n, undefined, usuario)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
  });

  it('404 quando o id não é de um cliente ativo (não vaza dados de interno/admin)', async () => {
    anotacaoRepository.ehClienteAtivo.mockResolvedValue(false);

    await expect(service.execute(8n, undefined, usuario)).rejects.toBeInstanceOf(
      ClienteNaoEncontradoException,
    );
    expect(repository.listarCandidatosLadoCliente).not.toHaveBeenCalled();
  });
});

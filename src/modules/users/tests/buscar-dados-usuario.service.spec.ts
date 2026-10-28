import { Test } from '@nestjs/testing';
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { BuscarDadosUsuarioRepository } from '../repositories/buscar-dados-usuario.repository';
import { BuscarDadosUsuarioService } from '../services/buscar-dados-usuario.service';

describe('BuscarDadosUsuarioService', () => {
  let service: BuscarDadosUsuarioService;
  const repository = {
    contarRemessasEmAndamento: jest.fn(),
    contarRemessasProduzidas: jest.fn(),
  };
  const featureGate = { featuresDo: jest.fn() };

  const usuario: AuthUser = {
    id: BigInt(10),
    email: 'cliente@empresa.com',
    nome: 'Cliente',
    ativo: true,
    tipoLogin: 'user',
    roles: ['cliente'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarDadosUsuarioService,
        { provide: BuscarDadosUsuarioRepository, useValue: repository },
        { provide: FeatureGateService, useValue: featureGate },
      ],
    }).compile();

    service = moduleRef.get(BuscarDadosUsuarioService);
  });

  it('retorna dados do usuário, totais de remessas e features habilitadas', async () => {
    repository.contarRemessasEmAndamento.mockResolvedValue(4);
    repository.contarRemessasProduzidas.mockResolvedValue(2);
    featureGate.featuresDo.mockResolvedValue(['criar_remessa']);

    await expect(service.execute(usuario)).resolves.toEqual({
      id: BigInt(10),
      nome: 'Cliente',
      email: 'cliente@empresa.com',
      remessas_em_andamento: 4,
      total_remessas_produzidas: 2,
      features: ['criar_remessa'],
    });
    expect(repository.contarRemessasEmAndamento).toHaveBeenCalledWith(BigInt(10));
    expect(repository.contarRemessasProduzidas).toHaveBeenCalledWith(BigInt(10));
    expect(featureGate.featuresDo).toHaveBeenCalledWith(usuario);
  });
});

/**
 * IMPORTS
 */
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

// exceptions
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';

// repositories
import { UsuarioInternoComPapelRepository } from '../repositories/usuario-interno-com-papel.repository';

// services
import { BuscarUsuarioInternoService } from '../services/buscar-usuario-interno.service';

// fixtures do módulo (usuário do Prisma)
import { criarUsuarioFake } from './fixtures';

describe('BuscarUsuarioInternoService', () => {
  const repository = { buscarPorId: jest.fn() };
  let service: BuscarUsuarioInternoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarUsuarioInternoService,
        { provide: UsuarioInternoComPapelRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(BuscarUsuarioInternoService);
  });

  it('devolve o usuário interno mapeado', async () => {
    repository.buscarPorId.mockResolvedValue({ usuario: criarUsuarioFake(), papel: 'recepcao' });

    await expect(service.execute(12n)).resolves.toMatchObject({ id: 12n, papel: 'recepcao' });
    expect(repository.buscarPorId).toHaveBeenCalledWith(12n);
  });

  it('lança 404 quando não é usuário interno', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    const promessa = service.execute(99n);

    await expect(promessa).rejects.toBeInstanceOf(UsuarioInternoNaoEncontradoException);
    await expect(promessa).rejects.toMatchObject({
      message: 'Usuário interno não encontrado.',
      status: HttpStatus.NOT_FOUND,
    });
  });
});

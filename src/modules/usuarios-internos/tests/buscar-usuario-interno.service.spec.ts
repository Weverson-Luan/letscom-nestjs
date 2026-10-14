import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UsuarioInternoNaoEncontradoException } from '../exceptions/usuario-interno-nao-encontrado.exception';
import { UsuarioInternoRepository } from '../repositories/usuario-interno.repository';
import { BuscarUsuarioInternoService } from '../services/buscar-usuario-interno.service';
import { criarUsuarioFake } from './fixtures';

describe('BuscarUsuarioInternoService', () => {
  const repository = { buscarPorId: jest.fn() };
  let service: BuscarUsuarioInternoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuscarUsuarioInternoService,
        { provide: UsuarioInternoRepository, useValue: repository },
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

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HashService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(4) },
        },
      ],
    }).compile();

    service = module.get(HashService);
  });

  it('make gera hash diferente da senha em texto claro', async () => {
    const password = 'Senha123';
    const hash = await service.make(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('check retorna true para senha bcrypt correta', async () => {
    const password = 'Senha123';
    const hash = await service.make(password);

    await expect(service.check(password, hash)).resolves.toBe(true);
  });

  it('check retorna false para senha incorreta', async () => {
    const hash = await service.make('Senha123');

    await expect(service.check('SenhaErrada1', hash)).resolves.toBe(false);
  });

  it('check aceita hash legado PHP ($2y$)', async () => {
    const password = 'Senha123';
    const hash = await service.make(password);
    const phpHash = `$2y$${hash.slice(4)}`;

    await expect(service.check(password, phpHash)).resolves.toBe(true);
  });

  it('check aceita hash legado MD5', async () => {
    const md5Hash = '098f6bcd4621d373cade4e832627b4f6';

    await expect(service.check('test', md5Hash)).resolves.toBe(true);
    await expect(service.check('wrong', md5Hash)).resolves.toBe(false);
  });

  it('check retorna false quando hash está vazio', async () => {
    await expect(service.check('Senha123', '')).resolves.toBe(false);
  });
});

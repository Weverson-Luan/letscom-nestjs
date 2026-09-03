import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtTokenService } from '../services/jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  const secret = process.env.JWT_SECRET!;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.secret') return secret;
              if (key === 'jwt.accessTtlDays') return 7;
              if (key === 'jwt.algorithm') return 'HS256';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(JwtTokenService);
  });

  it('cria token JWT com payload de usuário interno', () => {
    const token = service.createToken({
      sub: BigInt(42),
      tipo_login: 'user',
      email: 'admin@letscom.com',
    });

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    expect(decoded.sub).toBe(42);
    expect(decoded.tipo_login).toBe('user');
    expect(decoded.email).toBe('admin@letscom.com');
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp! - decoded.iat!).toBe(7 * 24 * 60 * 60);
  });

  it('cria token JWT com payload de subordinado incluindo cliente_id', () => {
    const token = service.createToken({
      sub: 10,
      tipo_login: 'subordinado',
      email: 'sub@letscom.com',
      cliente_id: BigInt(5),
    });

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    expect(decoded.tipo_login).toBe('subordinado');
    expect(decoded.cliente_id).toBe(5);
  });
});

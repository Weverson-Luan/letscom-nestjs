import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Hashing de senha com bcrypt (equivalente ao Hash::make / Hash::check do
 * Laravel). Suporta hashes PHP (`$2y$`) e legado MD5 do banco antigo.
 */
@Injectable()
export class HashService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.get<number>('security.bcryptRounds') ?? 12;
  }

  async make(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async check(plain: string, hashed: string): Promise<boolean> {
    if (!hashed) return false;

    if (hashed.startsWith('$2y$') || hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
      const normalized = `$2b$${hashed.slice(4)}`;
      return bcrypt.compare(plain, normalized);
    }

    // Legado: MD5 puro (alguns registros antigos no Laravel).
    if (/^[a-f0-9]{32}$/i.test(hashed)) {
      return createHash('md5').update(plain).digest('hex') === hashed.toLowerCase();
    }

    return bcrypt.compare(plain, hashed);
  }
}

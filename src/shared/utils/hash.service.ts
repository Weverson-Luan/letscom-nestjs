import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Hashing de senha com bcrypt (equivalente ao Hash::make / Hash::check do
 * Laravel). Usa BCRYPT_ROUNDS (default 12).
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
    return bcrypt.compare(plain, hashed);
  }
}

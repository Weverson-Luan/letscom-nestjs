import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública (sem exigir JWT), equivalente às rotas fora do
 * grupo `auth.jwt` no Laravel.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

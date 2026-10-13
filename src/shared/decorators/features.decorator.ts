import { SetMetadata } from '@nestjs/common';

export const FEATURES_KEY = 'features';

/**
 * Equivalente ao middleware `feature:key_a,key_b` do Laravel — libera quando o
 * usuário tem pelo menos uma das features.
 * Uso: @RequireFeatures(Feature.CRIAR_CLIENTE, Feature.EDITAR_CLIENTE)
 */
export const RequireFeatures = (...features: string[]) => SetMetadata(FEATURES_KEY, features);

import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: anexo fora das regras (quantidade, tamanho, extensão). */
export class AnexoCompromissoInvalidoException extends BusinessException {}

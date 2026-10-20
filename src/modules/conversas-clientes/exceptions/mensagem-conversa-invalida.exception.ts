import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 400: mensagem sem texto e sem anexo, ou anexo fora das regras (quantidade, tamanho, extensão). */
export class MensagemConversaInvalidaException extends BusinessException {}

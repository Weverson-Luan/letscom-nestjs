/** Arquivo recebido pelo FileInterceptor (multer em memória). */
export type ArquivoEnviado = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};

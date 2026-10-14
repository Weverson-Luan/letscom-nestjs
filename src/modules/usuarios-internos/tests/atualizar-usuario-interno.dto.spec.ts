import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AtualizarUsuarioInternoDto,
  MENSAGEM_EMAIL_NAO_ALTERAVEL,
} from '../dto/atualizar-usuario-interno.dto';

async function errosDe(body: Record<string, unknown>) {
  const erros = await validate(plainToInstance(AtualizarUsuarioInternoDto, body), {
    whitelist: true,
  });
  return erros.flatMap((erro) => Object.values(erro.constraints ?? {}));
}

describe('AtualizarUsuarioInternoDto', () => {
  it('aceita edição dos dados sem e-mail', async () => {
    await expect(
      errosDe({
        nome: 'Novo',
        telefone: '11888887777',
        documento: null,
        tipo_pessoa: 'J',
        senha: 'nova-senha',
        ativo: false,
      }),
    ).resolves.toEqual([]);
  });

  it.each(['novo@letscom.com', '', null])('rejeita e-mail no body (%p)', async (email) => {
    await expect(errosDe({ nome: 'Novo', email })).resolves.toContain(MENSAGEM_EMAIL_NAO_ALTERAVEL);
  });

  it('rejeita senha curta e tipo de pessoa inválido', async () => {
    const erros = await errosDe({ senha: '123', tipo_pessoa: 'X' });

    expect(erros).toEqual(
      expect.arrayContaining([
        'A senha deve ter pelo menos 6 caracteres.',
        'O tipo de pessoa deve ser F ou J.',
      ]),
    );
  });
});

/**
 * IMPORTS
 */

function validateResetPasswordBody(body: Record<string, any>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!body?.token) {
    errors.token = ['O token é obrigatório.'];
  }
  if (!body?.senha) {
    errors.senha = ['A senha antiga é obrigatória.'];
  } else if (String(body.senha).length < 6) {
    errors.senha = ['A senha deve ter pelo menos 6 caracteres.'];
  }
  if (!body?.nova_senha) {
    errors.nova_senha = ['A nova senha é obrigatória.'];
  } else if (body.nova_senha !== body.senha) {
    errors.nova_senha = ['As senhas não coincidem.'];
  }
  return errors;
}

/**
 * EXPORTS
 */
export { validateResetPasswordBody };

import { User } from '@prisma/client';
import { PapelInterno } from '../usuarios-internos.constants';

/** Usuário interno na resposta HTTP (contrato do backoffice — sem senha). */
export function mapearUsuarioInterno(usuario: User, papel: PapelInterno) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    documento: usuario.documento,
    tipo_pessoa: usuario.tipoPessoa,
    ativo: usuario.ativo,
    papel,
    created_at: usuario.createdAt,
    updated_at: usuario.updatedAt,
  };
}

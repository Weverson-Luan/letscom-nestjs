/**
 * IMPORTS
 */

// helpers do módulo (função testada)
import {
  buscarDestinatarioPriorizandoSolicitante,
  buscarDestinatarioPriorizandoSubordinado,
} from '../helpers/buscar-destinatario-remessa.helper';

describe('buscarDestinatarioPriorizandoSubordinado', () => {
  const titular = { email: 'cadastro@cliente.com', nome: 'Titular' };
  const subordinado = { email: 'solicitante@cliente.com', nome: 'Subordinado' };

  const remessaBase = {
    userIdSolicitanteRemessa: null,
    usersSolicitanteSubordinadoId: null,
    solicitante: null,
    solicitanteSubordinado: null,
  };

  it('prioriza o subordinado quando a remessa tem titular e subordinado', () => {
    const remessa = {
      userIdSolicitanteRemessa: 5n,
      usersSolicitanteSubordinadoId: 8n,
      solicitante: titular,
      solicitanteSubordinado: subordinado,
    };

    expect(buscarDestinatarioPriorizandoSubordinado(remessa)).toEqual(subordinado);
  });

  it('usa o solicitante quando não há subordinado', () => {
    const remessa = { ...remessaBase, userIdSolicitanteRemessa: 5n, solicitante: titular };

    expect(buscarDestinatarioPriorizandoSubordinado(remessa)).toEqual(titular);
  });

  it('usa o solicitante quando o subordinado não tem e-mail', () => {
    const remessa = {
      userIdSolicitanteRemessa: 5n,
      usersSolicitanteSubordinadoId: 8n,
      solicitante: titular,
      solicitanteSubordinado: { email: null, nome: 'Sem e-mail' },
    };

    expect(buscarDestinatarioPriorizandoSubordinado(remessa)).toEqual(titular);
  });

  it('usa "Solicitante" como nome quando o destinatário não tem nome', () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: { email: subordinado.email, nome: null },
    };

    expect(buscarDestinatarioPriorizandoSubordinado(remessa)).toEqual({
      email: subordinado.email,
      nome: 'Solicitante',
    });
  });

  it('retorna null quando nenhum solicitante tem e-mail', () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: { email: null, nome: 'Sem e-mail' },
    };

    expect(buscarDestinatarioPriorizandoSubordinado(remessaBase)).toBeNull();
    expect(buscarDestinatarioPriorizandoSubordinado(remessa)).toBeNull();
  });
});

describe('buscarDestinatarioPriorizandoSolicitante', () => {
  const titular = { email: 'cadastro@cliente.com', nome: 'Titular' };
  const subordinado = { email: 'solicitante@cliente.com', nome: 'Subordinado' };

  const remessaBase = {
    userIdSolicitanteRemessa: null,
    usersSolicitanteSubordinadoId: null,
    solicitante: null,
    solicitanteSubordinado: null,
  };

  it('usa o solicitante (users) quando a remessa tem solicitante e subordinado', () => {
    const remessa = {
      userIdSolicitanteRemessa: 5n,
      usersSolicitanteSubordinadoId: 8n,
      solicitante: titular,
      solicitanteSubordinado: subordinado,
    };

    expect(buscarDestinatarioPriorizandoSolicitante(remessa)).toEqual(titular);
  });

  it('usa o subordinado (users_cliente) quando não há solicitante em users', () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: subordinado,
    };

    expect(buscarDestinatarioPriorizandoSolicitante(remessa)).toEqual(subordinado);
  });

  it('usa o subordinado quando o id do solicitante não existe mais em users', () => {
    const remessa = {
      ...remessaBase,
      userIdSolicitanteRemessa: 5n,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: subordinado,
    };

    expect(buscarDestinatarioPriorizandoSolicitante(remessa)).toEqual(subordinado);
  });

  it('retorna null quando não há e-mail em users nem em users_cliente', () => {
    const remessa = {
      ...remessaBase,
      usersSolicitanteSubordinadoId: 8n,
      solicitanteSubordinado: { email: null, nome: 'Sem e-mail' },
    };

    expect(buscarDestinatarioPriorizandoSolicitante(remessaBase)).toBeNull();
    expect(buscarDestinatarioPriorizandoSolicitante(remessa)).toBeNull();
  });
});

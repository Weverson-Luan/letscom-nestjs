/**
 * IMPORTS
 */

// helpers
import { deveIgnorarEntradaDoZip } from '../services/helpers/deve-ignorar-entrada-do-zip.helper';

describe('deveIgnorarEntradaDoZip', () => {
  it.each([
    'pasta/',
    'pasta\\',
    '__MACOSX/123.jpg',
    'fotos/._123.jpg',
    '._123.jpg',
    '.DS_Store',
    'fotos\\.DS_Store',
  ])('ignora %p', (nome) => {
    expect(deveIgnorarEntradaDoZip(nome)).toBe(true);
  });

  it.each(['123.jpg', 'fotos/123.jpg', 'fotos\\456.png', 'DS_Store.jpg'])(
    'mantém a foto %p',
    (nome) => {
      expect(deveIgnorarEntradaDoZip(nome)).toBe(false);
    },
  );
});

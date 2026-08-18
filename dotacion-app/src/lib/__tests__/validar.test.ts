import { describe, expect, it } from 'vitest';
import { correoValido, telefonoValido } from '../validar';

describe('correoValido', () => {
  it('acepta correos con estructura válida', () => {
    expect(correoValido('compras@empresa.com')).toBe(true);
    expect(correoValido('a.b-c@sub.dominio.co')).toBe(true);
  });
  it('vacío es válido (es opcional)', () => {
    expect(correoValido('')).toBe(true);
    expect(correoValido('   ')).toBe(true);
  });
  it('rechaza correos mal formados', () => {
    expect(correoValido('a@')).toBe(false);
    expect(correoValido('@b.com')).toBe(false);
    expect(correoValido('sinarroba.com')).toBe(false);
    expect(correoValido('a@b')).toBe(false);
    expect(correoValido('a b@c.com')).toBe(false);
  });
});

describe('telefonoValido', () => {
  it('acepta celulares y fijos reales (con o sin formato)', () => {
    expect(telefonoValido('3001234567')).toBe(true);
    expect(telefonoValido('+57 300 123 4567')).toBe(true);
    expect(telefonoValido('601 234 5678')).toBe(true);
    expect(telefonoValido('2047378')).toBe(true);
  });
  it('vacío es válido', () => {
    expect(telefonoValido('')).toBe(true);
  });
  it('rechaza demasiado cortos o largos', () => {
    expect(telefonoValido('1234')).toBe(false);
    expect(telefonoValido('12345678901234')).toBe(false);
  });
  it('rechaza números falsos (todos iguales o secuencias)', () => {
    expect(telefonoValido('0000000000')).toBe(false);
    expect(telefonoValido('1111111')).toBe(false);
    expect(telefonoValido('1234567890')).toBe(false);
  });
});

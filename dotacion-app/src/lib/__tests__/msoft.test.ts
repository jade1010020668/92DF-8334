import { describe, expect, it } from 'vitest';
import { correoAutomaticoConfigurado, cruzarRespuestas, extraerRemitentes } from '../msoft';
import { CONFIG_DEFAULT } from '../config';
import type { Empresa } from '../../types';

function empresa(parcial: Partial<Empresa>): Empresa {
  return {
    id: parcial.id ?? 'e1',
    nombre: parcial.nombre ?? 'Empresa',
    sector: '',
    email: parcial.email ?? '',
    telefono: '',
    contacto: '',
    direccion: '',
    estado: parcial.estado ?? 'enviado',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fuente: 'manual',
  };
}

describe('correoAutomaticoConfigurado', () => {
  it('false sin Client ID (el valor por defecto)', () => {
    expect(correoAutomaticoConfigurado(CONFIG_DEFAULT)).toBe(false);
  });
  it('true con Client ID', () => {
    expect(correoAutomaticoConfigurado({ ...CONFIG_DEFAULT, microsoftClientId: 'abc-123' })).toBe(true);
  });
});

describe('extraerRemitentes', () => {
  it('saca los correos de la respuesta de la bandeja, en minúsculas', () => {
    const json = {
      value: [
        { from: { emailAddress: { address: 'Compras@Taller.com' } } },
        { from: { emailAddress: { address: 'gerencia@ferre.co' } } },
        { from: {} },
        {},
      ],
    };
    const r = extraerRemitentes(json);
    expect(r.has('compras@taller.com')).toBe(true);
    expect(r.has('gerencia@ferre.co')).toBe(true);
    expect(r.size).toBe(2);
  });

  it('tolera respuestas vacías o basura', () => {
    expect(extraerRemitentes(null).size).toBe(0);
    expect(extraerRemitentes({}).size).toBe(0);
    expect(extraerRemitentes({ value: 'x' }).size).toBe(0);
  });
});

describe('cruzarRespuestas', () => {
  const remitentes = new Set(['compras@taller.com', 'otro@x.com']);

  it('marca solo las "enviado" cuyo correo escribió', () => {
    const lista = [
      empresa({ id: 'a', email: 'compras@taller.com', estado: 'enviado' }),
      empresa({ id: 'b', email: 'compras@taller.com', estado: 'pendiente' }), // aún no contactada
      empresa({ id: 'c', email: 'nadie@nunca.com', estado: 'enviado' }),
      empresa({ id: 'd', email: '', estado: 'enviado' }),
    ];
    const r = cruzarRespuestas(lista, remitentes);
    expect(r.map((e) => e.id)).toEqual(['a']);
  });

  it('no distingue mayúsculas en el correo de la empresa', () => {
    const lista = [empresa({ id: 'a', email: 'COMPRAS@TALLER.COM ', estado: 'enviado' })];
    expect(cruzarRespuestas(lista, remitentes)).toHaveLength(1);
  });
});

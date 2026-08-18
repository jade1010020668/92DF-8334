import { describe, expect, it } from 'vitest';
import { planificarInsercion } from '../useEmpresas';
import type { Empresa } from '../../types';

function empresa(parcial: Partial<Empresa>): Empresa {
  return {
    id: parcial.id ?? 'e1',
    nombre: parcial.nombre ?? 'Ferretería El Tornillo',
    sector: parcial.sector ?? '',
    email: parcial.email ?? '',
    telefono: parcial.telefono ?? '',
    contacto: parcial.contacto ?? '',
    direccion: parcial.direccion ?? '',
    estado: parcial.estado ?? 'pendiente',
    fechaCreacion: parcial.fechaCreacion ?? '2026-01-01T00:00:00.000Z',
    fuente: parcial.fuente ?? 'manual',
    ...parcial,
  };
}

describe('planificarInsercion: completa datos de las repetidas', () => {
  it('rellena correo y teléfono vacíos de una empresa existente', () => {
    const actuales = [empresa({ nombre: 'Ferretería El Tornillo', email: '', telefono: '' })];
    const plan = planificarInsercion(
      actuales,
      [{ nombre: 'Ferretería El Tornillo', email: 'ventas@tornillo.co', telefono: '3105551234' }],
      'excel',
    );
    expect(plan.agregadas).toBe(0);
    expect(plan.duplicadas).toBe(0);
    expect(plan.actualizadas).toBe(1);
    expect(plan.lista).toHaveLength(1);
    expect(plan.lista[0].email).toBe('ventas@tornillo.co');
    expect(plan.lista[0].telefono).toBe('3105551234');
    // Conserva id, estado e historial de la fila original.
    expect(plan.lista[0].id).toBe('e1');
  });

  it('NUNCA pisa un dato ya escrito', () => {
    const actuales = [
      empresa({ email: 'gerencia@tornillo.co', telefono: '6017213566', estado: 'enviado' }),
    ];
    const plan = planificarInsercion(
      actuales,
      [{ nombre: 'Ferretería El Tornillo', email: 'otro@x.com', telefono: '999' }],
      'excel',
    );
    expect(plan.actualizadas).toBe(0);
    expect(plan.duplicadas).toBe(1);
    expect(plan.lista[0].email).toBe('gerencia@tornillo.co');
    expect(plan.lista[0].telefono).toBe('6017213566');
    expect(plan.lista[0].estado).toBe('enviado');
  });

  it('rellena coordenadas y sector si faltan, y cuenta como actualizada', () => {
    const actuales = [empresa({ sector: '', lat: undefined, lon: undefined })];
    const plan = planificarInsercion(
      actuales,
      [{ nombre: 'Ferretería El Tornillo', sector: 'Ferreterías', lat: 4.6, lon: -74.1 }],
      'maps',
    );
    expect(plan.actualizadas).toBe(1);
    expect(plan.lista[0].sector).toBe('Ferreterías');
    expect(plan.lista[0].lat).toBe(4.6);
    expect(plan.lista[0].lon).toBe(-74.1);
  });

  it('empareja por nombre aunque cambien tildes y mayúsculas', () => {
    const actuales = [empresa({ nombre: 'CONSTRUCCIONES PÉREZ S.A.S', email: '' })];
    const plan = planificarInsercion(
      actuales,
      [{ nombre: 'construcciones perez sas', email: 'info@perez.co' }],
      'excel',
    );
    expect(plan.actualizadas).toBe(1);
    expect(plan.lista[0].email).toBe('info@perez.co');
  });

  it('la repetida sin datos nuevos sigue contando como duplicada y no toca la lista', () => {
    const actuales = [empresa({ email: 'a@b.co' })];
    const plan = planificarInsercion(actuales, [{ nombre: 'Ferretería El Tornillo' }], 'excel');
    expect(plan.duplicadas).toBe(1);
    expect(plan.actualizadas).toBe(0);
    expect(plan.lista).toBe(actuales);
  });

  it('mezcla nuevas + actualizadas en una sola importación', () => {
    const actuales = [empresa({ nombre: 'Vieja Sin Correo', email: '' })];
    const plan = planificarInsercion(
      actuales,
      [
        { nombre: 'Vieja Sin Correo', email: 'nuevo@correo.co' },
        { nombre: 'Totalmente Nueva S.A.S', email: 'hola@nueva.co' },
      ],
      'excel',
    );
    expect(plan.agregadas).toBe(1);
    expect(plan.actualizadas).toBe(1);
    expect(plan.lista).toHaveLength(2);
    const vieja = plan.lista.find((e) => e.nombre === 'Vieja Sin Correo');
    expect(vieja?.email).toBe('nuevo@correo.co');
  });

  it('dos filas repetidas dentro del mismo archivo se consolidan (la 2ª completa a la 1ª)', () => {
    const plan = planificarInsercion(
      [],
      [
        { nombre: 'Nueva Duplicada', telefono: '3001112233' },
        { nombre: 'Nueva Duplicada', email: 'dup@x.co' },
      ],
      'excel',
    );
    expect(plan.agregadas).toBe(1);
    expect(plan.actualizadas).toBe(1);
    expect(plan.lista[0].telefono).toBe('3001112233');
    expect(plan.lista[0].email).toBe('dup@x.co');
  });
});

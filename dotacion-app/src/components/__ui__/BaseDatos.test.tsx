// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

vi.mock('../MapaProspectos', () => ({
  MapaProspectos: () => <div data-testid="mapa-mock">mapa</div>,
}));

const BASE = [
  { nombre: 'Taller Real Uno', sector: 'car repair', telefono: '3001112222', email: '', direccion: 'Cra 34, Bogotá', website: '', lat: 4.58, lon: -74.13, metros: 120 },
  { nombre: 'Ferretería Real Dos', sector: 'hardware', telefono: '', email: '', direccion: 'Cll 2, Bogotá', website: 'ferre.co', lat: 4.59, lon: -74.14, metros: 800 },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dotacionpro.vioGuia', 'true');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('empresas-bogota.json')) {
      return { ok: true, json: async () => BASE } as Response;
    }
    return { ok: false } as Response;
  }));
});
afterEach(() => vi.unstubAllGlobals());

function pestana(nombre: RegExp) {
  return screen.getAllByRole('button', { name: nombre })[0];
}

describe('Cargar base de datos inicial', () => {
  it('carga las empresas reales y las agrega a la lista', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Botón en Primeros pasos (lista vacía).
    await user.click(pestana(/Cargar .*empresas de Bogotá/i));

    // Se mueve a Empresas y aparecen las cargadas.
    expect((await screen.findAllByText('Taller Real Uno')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Ferretería Real Dos')).length).toBeGreaterThan(0);

    // Quedaron persistidas con sus coordenadas.
    const guardadas = JSON.parse(localStorage.getItem('dotacionpro.empresas') || '[]');
    expect(guardadas).toHaveLength(2);
    expect(guardadas.some((e: { lat?: number }) => e.lat === 4.58)).toBe(true);
    // La nota incluye la distancia al negocio.
    expect(guardadas.some((e: { notas?: string }) => (e.notas || '').includes('del negocio'))).toBe(true);
  });

  it('no duplica si se carga dos veces', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Cargar .*empresas de Bogotá/i));
    await screen.findAllByText('Taller Real Uno');
    // Botón "Cargar empresas de Bogotá" en la barra de Empresas.
    await user.click(pestana(/Cargar empresas de Bogotá/i));
    const guardadas = JSON.parse(localStorage.getItem('dotacionpro.empresas') || '[]');
    expect(guardadas).toHaveLength(2);
  });
});

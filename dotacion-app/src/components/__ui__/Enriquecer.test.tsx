// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

vi.mock('../MapaProspectos', () => ({
  MapaProspectos: () => <div data-testid="mapa-mock">mapa</div>,
}));

const EMPRESAS = [
  { id: 'a', nombre: 'Taller Sin Tel Uno', sector: 'car repair', email: '', telefono: '', contacto: '', direccion: 'Cra 30, Bogotá', estado: 'pendiente', fechaCreacion: new Date().toISOString(), fuente: 'maps' },
  { id: 'b', nombre: 'Ferretería Sin Tel Dos', sector: 'hardware', email: '', telefono: '', contacto: '', direccion: 'Cll 2, Bogotá', estado: 'pendiente', fechaCreacion: new Date().toISOString(), fuente: 'maps' },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dotacionpro.vioGuia', 'true');
  localStorage.setItem('dotacionpro.empresas', JSON.stringify(EMPRESAS));
  // Configuración con clave de Google
  localStorage.setItem('dotacionpro.config', JSON.stringify({ googleMapsApiKey: 'clave-prueba' }));
  // Google responde con un teléfono real para cualquier búsqueda
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('places:searchText')) {
      return {
        ok: true,
        json: async () => ({
          places: [{ nationalPhoneNumber: '601 555 0000', websiteUri: 'https://encontrado.co' }],
        }),
      } as Response;
    }
    return { ok: false } as Response;
  }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => vi.unstubAllGlobals());

function pestana(nombre: RegExp) {
  return screen.getAllByRole('button', { name: nombre })[0];
}

describe('Completar teléfonos con Google', () => {
  it('rellena el teléfono de las empresas que no lo tienen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/^Empresas/i));

    // El botón aparece porque hay clave de Google.
    await user.click(screen.getByRole('button', { name: /Completar teléfonos \(Google\)/i }));

    // Tras el proceso, las empresas quedan con el teléfono encontrado en localStorage.
    await vi.waitFor(() => {
      const g = JSON.parse(localStorage.getItem('dotacionpro.empresas') || '[]');
      expect(g.every((e: { telefono: string }) => e.telefono === '601 555 0000')).toBe(true);
    }, { timeout: 5000 });
  });

  it('sin clave de Google, el botón no aparece', async () => {
    localStorage.setItem('dotacionpro.config', JSON.stringify({ googleMapsApiKey: '' }));
    // Necesita login? no. Render directo.
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/^Empresas/i));
    expect(screen.queryByRole('button', { name: /Completar teléfonos \(Google\)/i })).not.toBeInTheDocument();
  });
});


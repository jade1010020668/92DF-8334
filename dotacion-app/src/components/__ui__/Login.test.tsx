// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { hashClave } from '../../lib/acceso';

vi.mock('../MapaProspectos', () => ({
  MapaProspectos: () => <div data-testid="mapa-mock">mapa</div>,
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dotacionpro.vioGuia', 'true');
});

function pestana(nombre: RegExp) {
  return screen.getAllByRole('button', { name: nombre })[0];
}

describe('Acceso con clave', () => {
  it('sin clave configurada, la app abre directo (sin login)', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Dotación\s*Pro/i, level: 1 })).toBeInTheDocument();
    // No hay pantalla de "Ingresa tu clave".
    expect(screen.queryByLabelText(/Ingresa tu clave/i)).not.toBeInTheDocument();
  });

  it('crear clave en Configuración la activa y permite bloquear/entrar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Configuración/i));

    await user.type(screen.getByLabelText(/Crea tu clave/i), '2468');
    await user.type(screen.getByLabelText(/Repite la clave/i), '2468');
    await user.click(screen.getByRole('button', { name: /Activar clave/i }));

    // Aparece el botón Bloquear en el encabezado.
    const bloquear = await screen.findByRole('button', { name: /Bloquear/i });
    await user.click(bloquear);

    // Ahora se exige la clave.
    const login = screen.getByRole('form', { name: /Iniciar sesión/i });
    expect(within(login).getByLabelText(/Ingresa tu clave/i)).toBeInTheDocument();

    // Clave incorrecta: muestra error y no entra.
    await user.type(within(login).getByLabelText(/Ingresa tu clave/i), '0000');
    await user.click(within(login).getByRole('button', { name: /Entrar/i }));
    expect(screen.getByText(/Clave incorrecta/i)).toBeInTheDocument();

    // Clave correcta: entra a la app.
    await user.type(screen.getByLabelText(/Ingresa tu clave/i), '2468');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(screen.getByRole('heading', { name: /Dotación\s*Pro/i, level: 1 })).toBeInTheDocument();
  });

  it('si ya hay clave y la sesión no está desbloqueada, arranca pidiendo la clave', () => {
    localStorage.setItem('dotacionpro.acceso', JSON.stringify({ claveHash: hashClave('1357'), recordar: true }));
    localStorage.setItem('dotacionpro.desbloqueado', 'false');
    render(<App />);
    expect(screen.getByRole('form', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Leaflet necesita un DOM con medidas reales que jsdom no provee: lo mockeamos
// por un recuadro simple para poder montar la app sin romper.
vi.mock('../MapaProspectos', () => ({
  MapaProspectos: () => <div data-testid="mapa-mock">mapa</div>,
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dotacionpro.vioGuia', 'true');
});

function pestana(nombre: RegExp) {
  // El nombre de la pestaña aparece como botón en la navegación.
  return screen.getAllByRole('button', { name: nombre })[0];
}

describe('App — arranque y navegación', () => {
  it('muestra el encabezado y la pantalla de inicio', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Dotación\s*Pro/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Primeros pasos/i)).toBeInTheDocument();
  });

  it('navega por las 6 pestañas sin romperse', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const nombre of [/Empresas/i, /Buscar en el mapa/i, /Pedidos/i, /Estadísticas/i, /Configuración/i, /Inicio/i]) {
      await user.click(pestana(nombre));
    }
    // Tras volver a inicio, el dashboard sigue mostrando sus KPIs.
    expect(screen.getAllByText(/Empresas totales/i).length).toBeGreaterThan(0);
  });
});

describe('App — flujo: agregar empresa y crearle un pedido', () => {
  it('agrega una empresa desde el formulario y aparece en la lista', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Empresas/i));
    await user.click(screen.getByRole('button', { name: /Agregar empresa/i }));

    const dialogo = screen.getByRole('dialog', { name: /Agregar empresa/i });
    await user.type(within(dialogo).getByLabelText(/Nombre de la empresa/i), 'Taller Pruebas SAS');
    await user.type(within(dialogo).getByLabelText(/Correo/i), 'compras@taller.co');
    await user.type(within(dialogo).getByLabelText(/Teléfono/i), '3001234567');
    await user.click(within(dialogo).getByRole('button', { name: /Agregar empresa/i }));

    // Aparece en la tabla (desktop) y en las tarjetas (móvil): ambas en el DOM.
    expect((await screen.findAllByText('Taller Pruebas SAS')).length).toBeGreaterThan(0);
  });

  it('valida que el nombre es obligatorio', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Empresas/i));
    await user.click(screen.getByRole('button', { name: /Agregar empresa/i }));
    const dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /Agregar empresa/i }));
    expect(within(dialogo).getByText(/Escribe el nombre de la empresa/i)).toBeInTheDocument();
  });

  it('crea un pedido para una empresa y muestra el total', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1) Crear empresa
    await user.click(pestana(/Empresas/i));
    await user.click(screen.getByRole('button', { name: /Agregar empresa/i }));
    let dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/Nombre de la empresa/i), 'Ferretería Centro');
    await user.click(within(dialogo).getByRole('button', { name: /Agregar empresa/i }));
    await screen.findAllByText('Ferretería Centro');

    // 2) Ir a Pedidos y crear uno
    await user.click(pestana(/Pedidos/i));
    await user.click(screen.getByRole('button', { name: /Nuevo pedido/i }));
    dialogo = screen.getByRole('dialog', { name: /Nuevo pedido/i });
    await user.selectOptions(within(dialogo).getByLabelText(/Empresa/i), 'Ferretería Centro');
    await user.type(within(dialogo).getAllByLabelText(/Producto/i)[0], 'Overol dril');
    const cant = within(dialogo).getByLabelText(/Cant\./i);
    await user.clear(cant);
    await user.type(cant, '10');
    const precio = within(dialogo).getByLabelText(/Precio c\/u/i);
    await user.clear(precio);
    await user.type(precio, '50000');
    await user.click(within(dialogo).getByRole('button', { name: /Crear pedido/i }));

    // El pedido aparece con el total 500.000 en la lista.
    expect((await screen.findAllByText(/500\.000/)).length).toBeGreaterThan(0);
  });
});

describe('App — configuración y persistencia', () => {
  it('guarda el nombre del negocio y persiste en localStorage', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Configuración/i));
    const nombre = screen.getByLabelText(/Nombre de tu empresa/i);
    await user.clear(nombre);
    await user.type(nombre, 'Dotaciones Prueba');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    const guardado = JSON.parse(localStorage.getItem('dotacionpro.config') || '{}');
    expect(guardado.nombreEmpresa).toBe('Dotaciones Prueba');
  });

  it('lee empresas existentes desde localStorage al arrancar', () => {
    localStorage.setItem(
      'dotacionpro.empresas',
      JSON.stringify([
        {
          id: 'x1',
          nombre: 'Empresa Guardada',
          sector: 'plásticos',
          email: '',
          telefono: '',
          contacto: '',
          direccion: '',
          estado: 'pendiente',
          fechaCreacion: new Date().toISOString(),
          fuente: 'manual',
        },
      ]),
    );
    render(<App />);
    fireEvent.click(pestana(/Empresas/i));
    expect(screen.getAllByText('Empresa Guardada').length).toBeGreaterThan(0);
  });
});

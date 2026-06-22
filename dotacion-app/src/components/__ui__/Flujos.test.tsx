// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

vi.mock('../MapaProspectos', () => ({
  MapaProspectos: () => <div data-testid="mapa-mock">mapa</div>,
}));

const empresaGuardada = {
  id: 'x1',
  nombre: 'Metalúrgica Andina',
  sector: 'metalmecánica',
  email: 'ventas@andina.co',
  telefono: '3009998888',
  contacto: 'Pedro',
  direccion: 'Calle 2 # 34-50',
  estado: 'pendiente',
  fechaCreacion: new Date().toISOString(),
  fuente: 'manual',
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dotacionpro.empresas', JSON.stringify([empresaGuardada]));
});

function pestana(nombre: RegExp) {
  return screen.getAllByRole('button', { name: nombre })[0];
}

describe('Ficha de empresa e historial', () => {
  it('abre la ficha, anota una nota y queda en el historial', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Empresas/i));
    // Botón "Ver ficha" (aparece en tabla y tarjetas: tomamos el primero).
    await user.click(screen.getAllByRole('button', { name: /Ver ficha de Metalúrgica Andina/i })[0]);

    const dialogo = screen.getByRole('dialog', { name: /Ficha de Metalúrgica Andina/i });
    const entrada = within(dialogo).getByPlaceholderText(/Llamé, pidió cotización/i);
    await user.type(entrada, 'Pidió 15 overoles talla 40');
    await user.click(within(dialogo).getByRole('button', { name: /Anotar/i }));

    expect(within(dialogo).getByText('Pidió 15 overoles talla 40')).toBeInTheDocument();
    expect(within(dialogo).getByText(/Historial de gestión/i)).toBeInTheDocument();
  });

  it('cambiar el estado de una empresa lo registra en el historial', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Empresas/i));

    // Cambia el estado con el selector (el primero, de la tabla).
    const selectorEstado = screen.getAllByLabelText(/Estado de Metalúrgica Andina/i)[0];
    await user.selectOptions(selectorEstado, 'cliente');

    // Abre la ficha y verifica el evento de estado.
    await user.click(screen.getAllByRole('button', { name: /Ver ficha de Metalúrgica Andina/i })[0]);
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/Estado → Cliente/i)).toBeInTheDocument();
  });
});

describe('Campaña de envío', () => {
  it('el dashboard ofrece enviar al haber pendientes y abre la campaña', async () => {
    const user = userEvent.setup();
    render(<App />);
    // En Inicio, con 1 empresa pendiente, el botón invita a enviar.
    const botonCampana = screen.getByRole('button', { name: /Enviar a 1 pendiente/i });
    expect(botonCampana).toBeInTheDocument();
    await user.click(botonCampana);

    // Se abre el modal de campaña mostrando la empresa.
    const dialogo = await screen.findByRole('dialog', { name: /Campaña de cotizaciones/i });
    expect(within(dialogo).getByText('Metalúrgica Andina')).toBeInTheDocument();
    // Tiene la vista previa del correo y el botón de marcar como enviada.
    expect(within(dialogo).getByRole('button', { name: /Marcar como enviada y seguir/i })).toBeInTheDocument();
  });

  it('marcar como enviada mueve la empresa a estado Enviado', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Enviar a 1 pendiente/i }));
    const dialogo = await screen.findByRole('dialog', { name: /Campaña de cotizaciones/i });
    await user.click(within(dialogo).getByRole('button', { name: /Marcar como enviada y seguir/i }));

    // Tras la cola, aparece el cierre de campaña.
    expect(await within(dialogo).findByText(/Campaña terminada/i)).toBeInTheDocument();

    // El estado guardado en localStorage es 'enviado' con fechaEnvio.
    const guardadas = JSON.parse(localStorage.getItem('dotacionpro.empresas') || '[]');
    expect(guardadas[0].estado).toBe('enviado');
    expect(guardadas[0].fechaEnvio).toBeTruthy();
  });
});

describe('Estadísticas reflejan la actividad', () => {
  it('muestra los KPIs de empresas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(pestana(/Estadísticas/i));
    expect(screen.getByText(/Tasa de respuesta/i)).toBeInTheDocument();
    expect(screen.getByText(/Tasa de conversión/i)).toBeInTheDocument();
  });
});

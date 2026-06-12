import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  BadgePercent,
  Bell,
  Building2,
  Database,
  Download,
  Eye,
  EyeOff,
  MapPinned,
  Package,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import type { ConfigApp, Empresa, ProductoCatalogo } from '../types';
import { exportarExcel } from '../lib/excel';
import type { MostrarToast } from '../App';

interface Props {
  config: ConfigApp;
  setConfig: Dispatch<SetStateAction<ConfigApp>>;
  empresas: Empresa[];
  borrarTodo: () => void;
  mostrarToast: MostrarToast;
}

export function Configuracion({ config, setConfig, empresas, borrarTodo, mostrarToast }: Props) {
  const [borrador, setBorrador] = useState<ConfigApp>(config);
  const [mostrarClave, setMostrarClave] = useState(false);

  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(config);

  const cambiar = <K extends keyof ConfigApp>(campo: K, valor: ConfigApp[K]) => {
    setBorrador((actual) => ({ ...actual, [campo]: valor }));
  };

  const cambiarProducto = (indice: number, cambios: Partial<ProductoCatalogo>) => {
    setBorrador((actual) => ({
      ...actual,
      productos: actual.productos.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
    }));
  };

  const guardar = () => {
    setConfig(borrador);
    mostrarToast('Cambios guardados. Ya salen en tus mensajes y cotizaciones.', 'exito');
  };

  const borrarTodas = () => {
    if (!window.confirm('¿Borrar TODAS las empresas de tu lista? Esta acción no se puede deshacer.')) {
      return;
    }
    if (
      !window.confirm(
        '¿Estás completamente seguro? Se perderán todas las empresas y sus estados. Te recomendamos exportar una copia en Excel antes.',
      )
    ) {
      return;
    }
    borrarTodo();
    mostrarToast('Se borraron todas las empresas.', 'info');
  };

  return (
    <div className="space-y-5">
      {/* Barra de guardado */}
      <div className="tarjeta flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
          {hayCambios && <p className="font-semibold text-amber-600">Tienes cambios sin guardar.</p>}
        </div>
        <button type="button" className="btn-primario" onClick={guardar} disabled={!hayCambios}>
          <Save className="h-5 w-5" aria-hidden="true" />
          Guardar cambios
        </button>
      </div>

      {/* 1. Datos de la empresa */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Building2 className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Datos de tu empresa
        </h3>
        <p className="text-slate-600">Estos datos salen en cada correo, WhatsApp y PDF de cotización.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="conf-nombre" className="etiqueta">
              Nombre de tu empresa
            </label>
            <input
              id="conf-nombre"
              className="campo"
              value={borrador.nombreEmpresa}
              onChange={(e) => cambiar('nombreEmpresa', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="conf-direccion" className="etiqueta">
              Dirección
            </label>
            <input
              id="conf-direccion"
              className="campo"
              value={borrador.direccion}
              onChange={(e) => cambiar('direccion', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="conf-ciudad" className="etiqueta">
              Ciudad
            </label>
            <input
              id="conf-ciudad"
              className="campo"
              value={borrador.ciudad}
              onChange={(e) => cambiar('ciudad', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="conf-telefono" className="etiqueta">
              Teléfono / WhatsApp
            </label>
            <input
              id="conf-telefono"
              type="tel"
              className="campo"
              placeholder="+57 300 123 4567"
              value={borrador.telefono}
              onChange={(e) => cambiar('telefono', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="conf-email" className="etiqueta">
              Correo
            </label>
            <input
              id="conf-email"
              type="email"
              className="campo"
              placeholder="ventas@tuempresa.com"
              value={borrador.email}
              onChange={(e) => cambiar('email', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="conf-remitente" className="etiqueta">
              ¿Quién firma los mensajes?
            </label>
            <input
              id="conf-remitente"
              className="campo"
              placeholder="Ej: Carlos Morales"
              value={borrador.remitente}
              onChange={(e) => cambiar('remitente', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 2. Descuentos */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <BadgePercent className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Mensaje de descuentos
        </h3>
        <div>
          <label htmlFor="conf-descuentos" className="etiqueta">
            Frase sobre descuentos que va en correos, WhatsApp y PDF
          </label>
          <textarea
            id="conf-descuentos"
            className="campo"
            rows={3}
            value={borrador.textoDescuentos}
            onChange={(e) => cambiar('textoDescuentos', e.target.value)}
          />
        </div>
      </section>

      {/* 3. Catálogo */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Package className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Catálogo de productos
        </h3>
        <p className="text-slate-600">
          Estos productos salen en tus mensajes y cotizaciones. En el precio, 0 = a convenir (no se
          muestra precio).
        </p>
        <ul className="space-y-3">
          {borrador.productos.map((producto, i) => (
            <li key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor={`prod-nombre-${i}`} className="etiqueta text-sm">
                  Producto
                </label>
                <input
                  id={`prod-nombre-${i}`}
                  className="campo"
                  value={producto.nombre}
                  onChange={(e) => cambiarProducto(i, { nombre: e.target.value })}
                />
              </div>
              <div className="w-24">
                <label htmlFor={`prod-unidad-${i}`} className="etiqueta text-sm">
                  Unidad
                </label>
                <input
                  id={`prod-unidad-${i}`}
                  className="campo"
                  value={producto.unidad}
                  onChange={(e) => cambiarProducto(i, { unidad: e.target.value })}
                />
              </div>
              <div className="w-36">
                <label htmlFor={`prod-precio-${i}`} className="etiqueta text-sm">
                  Precio desde
                </label>
                <input
                  id={`prod-precio-${i}`}
                  type="number"
                  min={0}
                  className="campo"
                  title="0 = a convenir"
                  value={producto.precioDesde}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    cambiarProducto(i, { precioDesde: Number.isNaN(valor) ? 0 : valor });
                  }}
                />
              </div>
              <button
                type="button"
                className="btn-icono hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Eliminar producto ${producto.nombre || i + 1}`}
                title="Eliminar producto"
                onClick={() =>
                  setBorrador((actual) => ({
                    ...actual,
                    productos: actual.productos.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-secundario"
          onClick={() =>
            setBorrador((actual) => ({
              ...actual,
              productos: [...actual.productos, { nombre: '', precioDesde: 0, unidad: 'unidad' }],
            }))
          }
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Agregar producto
        </button>
      </section>

      {/* 4. Seguimiento */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Bell className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Seguimiento
        </h3>
        <div>
          <label htmlFor="conf-dias" className="etiqueta">
            Días para sugerir seguimiento
          </label>
          <input
            id="conf-dias"
            type="number"
            min={1}
            max={30}
            className="campo w-36"
            value={borrador.diasSeguimiento}
            onChange={(e) => {
              const valor = Number(e.target.value);
              if (!Number.isNaN(valor)) cambiar('diasSeguimiento', Math.min(30, Math.max(1, valor)));
            }}
          />
          <p className="mt-1 text-slate-600">
            Te sugeriremos reescribir a una empresa después de este número de días sin respuesta.
          </p>
        </div>
      </section>

      {/* 5. Google Maps */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <MapPinned className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Búsqueda con Google Maps (opcional)
        </h3>
        <div>
          <label htmlFor="conf-clave-maps" className="etiqueta">
            Clave de Google Maps
          </label>
          <div className="flex gap-2">
            <input
              id="conf-clave-maps"
              type={mostrarClave ? 'text' : 'password'}
              className="campo"
              autoComplete="off"
              value={borrador.googleMapsApiKey}
              onChange={(e) => cambiar('googleMapsApiKey', e.target.value)}
            />
            <button
              type="button"
              className="btn-icono h-auto w-12 shrink-0 border border-slate-300"
              aria-label={mostrarClave ? 'Ocultar la clave' : 'Mostrar la clave'}
              onClick={() => setMostrarClave((v) => !v)}
            >
              {mostrarClave ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-slate-700">
          <p className="mb-2 font-semibold">¿Cómo conseguir la clave? (puedes pedir ayuda con esto)</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Entra a{' '}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                console.cloud.google.com
              </a>{' '}
              y crea un proyecto.
            </li>
            <li>Habilita la herramienta llamada «Places API (New)».</li>
            <li>Crea una clave (API key).</li>
            <li>Restringe la clave para que solo funcione desde el dominio de esta app.</li>
          </ol>
          <p className="mt-2 font-semibold">La clave se guarda solo en este navegador. No la compartas.</p>
        </div>
      </section>

      {/* 6. Mis datos */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Database className="h-6 w-6 text-blue-700" aria-hidden="true" />
          Mis datos
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => exportarExcel(empresas)}
            disabled={empresas.length === 0}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            Exportar copia en Excel
          </button>
          <button
            type="button"
            className="btn-peligro"
            onClick={borrarTodas}
            disabled={empresas.length === 0}
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Borrar todas las empresas
          </button>
        </div>
      </section>
    </div>
  );
}

import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  BadgePercent,
  Bell,
  Building2,
  Database,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Lock,
  MapPinned,
  Package,
  Plus,
  Save,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import type { ConfigApp, Empresa, Pedido, ProductoCatalogo } from '../types';
import { exportarExcel } from '../lib/excel';
import { descargarRespaldo, parsearRespaldo } from '../lib/respaldo';
import { hashClave, type Acceso } from '../lib/acceso';
import type { MostrarToast } from '../App';

interface Props {
  config: ConfigApp;
  setConfig: Dispatch<SetStateAction<ConfigApp>>;
  empresas: Empresa[];
  pedidos: Pedido[];
  borrarTodo: () => void;
  reemplazarTodo: (nuevas: Empresa[]) => void;
  reemplazarPedidos: (nuevos: Pedido[]) => void;
  acceso: Acceso;
  setAcceso: Dispatch<SetStateAction<Acceso>>;
  /** Marca la sesión como activa (al crear la clave no debe sacarte). */
  desbloquear: () => void;
  mostrarToast: MostrarToast;
}

export function Configuracion({
  config,
  setConfig,
  empresas,
  pedidos,
  borrarTodo,
  reemplazarTodo,
  reemplazarPedidos,
  acceso,
  setAcceso,
  desbloquear,
  mostrarToast,
}: Props) {
  const [borrador, setBorrador] = useState<ConfigApp>(config);
  // Las claves técnicas (Google/Brevo) van escondidas: solo confunden al
  // usuario normal. Si ya hay una clave puesta, se muestran abiertas.
  const [mostrarAvanzado, setMostrarAvanzado] = useState(
    () => Boolean(config.googleMapsApiKey.trim() || config.brevoApiKey.trim()),
  );
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mostrarClaveBrevo, setMostrarClaveBrevo] = useState(false);
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirma, setClaveConfirma] = useState('');
  const inputRespaldo = useRef<HTMLInputElement>(null);

  const guardarClave = () => {
    if (claveNueva.length < 4) {
      mostrarToast('La clave debe tener al menos 4 caracteres.', 'error');
      return;
    }
    if (claveNueva !== claveConfirma) {
      mostrarToast('Las dos claves no coinciden.', 'error');
      return;
    }
    setAcceso({ claveHash: hashClave(claveNueva), recordar: true });
    desbloquear(); // no te saca: quedas dentro con la sesión activa.
    setClaveNueva('');
    setClaveConfirma('');
    mostrarToast('Clave activada. Desde ahora la app pedirá tu clave para abrirse.', 'exito');
  };

  const quitarClave = () => {
    if (!window.confirm('¿Quitar la clave? Cualquiera con el enlace podrá abrir la app.')) return;
    setAcceso({ claveHash: '', recordar: true });
    mostrarToast('Clave eliminada.', 'info');
  };

  const restaurarRespaldo = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const input = evento.target;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    const leido = parsearRespaldo(await archivo.text());
    if (!leido) {
      mostrarToast('Ese archivo no es un respaldo de DotaciónPro.', 'error');
      return;
    }
    if (
      !window.confirm(
        `Esto reemplaza tu lista actual (${empresas.length} empresas, ${pedidos.length} pedidos) por la del respaldo (${leido.empresas.length} empresas, ${leido.pedidos.length} pedidos) y los datos del negocio. Las claves de Google/Brevo de este dispositivo se conservan. ¿Continuar?`,
      )
    ) {
      return;
    }
    // Las claves no viajan en el archivo: se conservan las de este dispositivo.
    const mezclada: ConfigApp = {
      ...leido.config,
      googleMapsApiKey: config.googleMapsApiKey,
      brevoApiKey: config.brevoApiKey,
    };
    reemplazarTodo(leido.empresas);
    reemplazarPedidos(leido.pedidos);
    setConfig(mezclada);
    setBorrador(mezclada);
    mostrarToast(
      `Respaldo restaurado: ${leido.empresas.length} empresas y ${leido.pedidos.length} pedidos.`,
      'exito',
    );
  };

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

      {/* 0. Acceso con clave */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Lock className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Acceso con clave (solo tú)
        </h3>
        {acceso.claveHash === '' ? (
          <>
            <p className="text-slate-600">
              Pon una clave para que solo tú puedas abrir la app. Una vez dentro, la sesión queda
              activa en este equipo; puedes bloquearla cuando quieras con el botón «Bloquear» de
              arriba.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="clave-nueva" className="etiqueta">
                  Crea tu clave (mín. 4)
                </label>
                <input
                  id="clave-nueva"
                  type="password"
                  inputMode="numeric"
                  className="campo"
                  autoComplete="new-password"
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="clave-confirma" className="etiqueta">
                  Repite la clave
                </label>
                <input
                  id="clave-confirma"
                  type="password"
                  inputMode="numeric"
                  className="campo"
                  autoComplete="new-password"
                  value={claveConfirma}
                  onChange={(e) => setClaveConfirma(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="btn-primario" onClick={guardarClave}>
              <Lock className="h-5 w-5" aria-hidden="true" />
              Activar clave
            </button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold text-emerald-700">
              <Lock className="h-5 w-5" aria-hidden="true" />
              La app está protegida con tu clave.
            </p>
            <p className="text-slate-600">
              Para cambiarla, quítala y crea una nueva. Si la olvidas, no se puede recuperar (es
              privada y local), pero puedes quitarla aquí mientras la sesión esté abierta.
            </p>
            <button type="button" className="btn-peligro" onClick={quitarClave}>
              Quitar la clave
            </button>
          </>
        )}
      </section>

      {/* 1. Datos de la empresa */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Building2 className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Datos de tu empresa
        </h3>
        <p className="text-slate-600">Estos datos salen en cada correo, WhatsApp y PDF de cotización.</p>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
          <p className="font-semibold">📧 ¿Cómo se envían los correos?</p>
          <p className="mt-1">
            Pon abajo el <strong>correo desde el que vendes</strong> (tu Outlook/Hotmail:
            dot.manantial@hotmail.com). Cuando envíes una cotización, la app abre tu Outlook con todo
            escrito y tú solo das «Enviar» — usa tu sesión de Hotmail de siempre, sin claves ni
            configuraciones. Si quieres que salgan solos (sin abrir el correo), más abajo está la
            opción de Brevo.
          </p>
        </div>
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
          <BadgePercent className="h-6 w-6 text-slate-700" aria-hidden="true" />
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

      {/* 2.5 Plantillas personalizadas */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <FileText className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Plantillas de mensajes (opcional)
        </h3>
        <p className="text-slate-600">
          Si las dejas vacías, la app usa su mensaje automático. Si escribes tu propio texto, puedes
          usar estos marcadores y la app los reemplaza por los datos de cada empresa:{' '}
          <code className="rounded bg-slate-100 px-1">[saludo]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[empresa]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[contacto]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[sector]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[productos]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[descuentos]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[remitente]</code>{' '}
          <code className="rounded bg-slate-100 px-1">[firma]</code>
        </p>
        <div>
          <label htmlFor="conf-plantilla-email" className="etiqueta">
            Cuerpo del correo personalizado
          </label>
          <textarea
            id="conf-plantilla-email"
            className="campo font-mono text-sm"
            rows={6}
            placeholder={'Ej:\n[saludo]\n\nLes escribimos de... \n\n[productos]\n\n[firma]'}
            value={borrador.plantillaEmail}
            onChange={(e) => cambiar('plantillaEmail', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="conf-plantilla-whatsapp" className="etiqueta">
            Mensaje de WhatsApp personalizado
          </label>
          <textarea
            id="conf-plantilla-whatsapp"
            className="campo font-mono text-sm"
            rows={5}
            placeholder="Ej: ¡Hola! Le escribo de [remitente] para [empresa]…"
            value={borrador.plantillaWhatsApp}
            onChange={(e) => cambiar('plantillaWhatsApp', e.target.value)}
          />
        </div>
      </section>

      {/* 3. Catálogo */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Package className="h-6 w-6 text-slate-700" aria-hidden="true" />
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
          <Bell className="h-6 w-6 text-slate-700" aria-hidden="true" />
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

      {/* Opciones avanzadas (claves técnicas): cerradas por defecto */}
      {!mostrarAvanzado && (
        <button
          type="button"
          className="btn-secundario"
          onClick={() => setMostrarAvanzado(true)}
        >
          Opciones avanzadas (Google Maps y envío automático) — normalmente no las necesitas
        </button>
      )}

      {/* 5. Google Maps */}
      {mostrarAvanzado && (
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <MapPinned className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Google Maps: búsqueda y llenado de teléfonos (opcional)
        </h3>
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          ⚠️ <strong>Esta opción puede generar cobros de Google.</strong> Google eliminó el crédito
          mensual gratuito que existía antes: cada búsqueda de teléfono puede facturarse a la tarjeta
          asociada a tu cuenta de Google. Úsala solo si sabes lo que haces y revisa tu facturación en
          Google Cloud. La app funciona perfectamente <strong>sin</strong> esto.
        </p>
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
      )}

      {/* 6. Brevo */}
      {mostrarAvanzado && (
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Zap className="h-6 w-6 text-slate-700" aria-hidden="true" />
          Envío automático de correos con Brevo (opcional)
        </h3>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          ⚠️ <strong>Opción experimental — puede no funcionar.</strong> El envío directo desde una
          página web suele ser bloqueado por el navegador, y los correos enviados «a nombre de» una
          cuenta de Hotmail por otro servicio suelen caer en spam. Recomendamos NO usar esto y enviar
          los correos con el botón normal (se abre tu Outlook y tú das «Enviar»), que sí funciona.
        </p>
        <div>
          <label htmlFor="conf-clave-brevo" className="etiqueta">
            Clave de Brevo
          </label>
          <div className="flex gap-2">
            <input
              id="conf-clave-brevo"
              type={mostrarClaveBrevo ? 'text' : 'password'}
              className="campo"
              autoComplete="off"
              value={borrador.brevoApiKey}
              onChange={(e) => cambiar('brevoApiKey', e.target.value)}
            />
            <button
              type="button"
              className="btn-icono h-auto w-12 shrink-0 border border-slate-300"
              aria-label={mostrarClaveBrevo ? 'Ocultar la clave de Brevo' : 'Mostrar la clave de Brevo'}
              onClick={() => setMostrarClaveBrevo((v) => !v)}
            >
              {mostrarClaveBrevo ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-slate-700">
          <p className="mb-2 font-semibold">¿Cómo conseguir la clave? (una sola vez, 10 minutos)</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Crea una cuenta gratis en{' '}
              <a
                href="https://www.brevo.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                brevo.com
              </a>
              .
            </li>
            <li>
              En Brevo, ve a «Senders» y agrega como remitente el MISMO correo que pusiste arriba en
              «Datos de tu empresa». Confírmalo desde tu bandeja de entrada.
            </li>
            <li>Menú de tu perfil → «SMTP &amp; API» → pestaña «API Keys» → «Generate a new API key».</li>
            <li>Pégala aquí y guarda los cambios.</li>
          </ol>
          <p className="mt-2 font-semibold">
            La clave se guarda solo en este navegador. No la compartas. Crea una clave exclusiva
            para esta app y, si cambias o pierdes el equipo, bórrala en Brevo y genera una nueva.
          </p>
        </div>
      </section>
      )}

      {/* 7. Mis datos */}
      <section className="tarjeta space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Database className="h-6 w-6 text-slate-700" aria-hidden="true" />
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
            className="btn-secundario"
            onClick={() => descargarRespaldo(empresas, config, pedidos)}
            disabled={empresas.length === 0}
          >
            <FileDown className="h-5 w-5" aria-hidden="true" />
            Guardar respaldo completo
          </button>
          <button type="button" className="btn-secundario" onClick={() => inputRespaldo.current?.click()}>
            <Upload className="h-5 w-5" aria-hidden="true" />
            Restaurar respaldo
          </button>
          <input
            ref={inputRespaldo}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={restaurarRespaldo}
          />
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
        <p className="text-slate-600">
          <strong>Para pasar todo al celular (o al revés):</strong> toca «Guardar respaldo completo»,
          envíate el archivo por WhatsApp o correo, ábrelo en el otro dispositivo y usa «Restaurar
          respaldo». Lleva la lista completa (con estados y fechas) y los datos del negocio; las
          claves de Google/Brevo no viajan en el archivo.
        </p>
      </section>
    </div>
  );
}

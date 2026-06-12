import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { Empresa, EstadoEmpresa, NuevaEmpresa } from '../types';
import { ESTADOS, ETIQUETA_ESTADO } from '../types';

interface Props {
  /** Empresa a editar; null/undefined para crear una nueva. */
  inicial?: Empresa | null;
  onGuardar: (datos: NuevaEmpresa) => void;
  onCerrar: () => void;
}

export function EmpresaForm({ inicial, onGuardar, onCerrar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [sector, setSector] = useState(inicial?.sector ?? '');
  const [contacto, setContacto] = useState(inicial?.contacto ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '');
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '');
  const [estado, setEstado] = useState<EstadoEmpresa>(inicial?.estado ?? 'pendiente');
  const [notas, setNotas] = useState(inicial?.notas ?? '');
  const [errorNombre, setErrorNombre] = useState(false);
  const [errorEmail, setErrorEmail] = useState(false);

  const editando = Boolean(inicial);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();

    const nombreInvalido = !nombreLimpio;
    const emailInvalido = Boolean(emailLimpio) && !emailLimpio.includes('@');
    setErrorNombre(nombreInvalido);
    setErrorEmail(emailInvalido);
    if (nombreInvalido || emailInvalido) return;

    onGuardar({
      nombre: nombreLimpio,
      sector: sector.trim(),
      contacto: contacto.trim(),
      email: emailLimpio,
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      estado: editando ? estado : undefined,
      notas: notas.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={editando ? 'Editar empresa' : 'Agregar empresa'}
    >
      <form
        onSubmit={guardar}
        className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        noValidate
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
            {editando ? 'Editar empresa' : 'Agregar empresa'}
          </h2>
          <button type="button" className="btn-icono" aria-label="Cerrar formulario" onClick={onCerrar}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="form-nombre" className="etiqueta">
              Nombre de la empresa <span className="text-rose-600">*</span>
            </label>
            <input
              id="form-nombre"
              className={`campo ${errorNombre ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Plásticos del Sur S.A.S."
              autoFocus
            />
            {errorNombre && (
              <p className="mt-1 font-semibold text-rose-600">Escribe el nombre de la empresa.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="form-sector" className="etiqueta">
                Sector
              </label>
              <input
                id="form-sector"
                className="campo"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej: plásticos"
              />
            </div>
            <div>
              <label htmlFor="form-contacto" className="etiqueta">
                Persona de contacto
              </label>
              <input
                id="form-contacto"
                className="campo"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ej: María Pérez"
              />
            </div>
            <div>
              <label htmlFor="form-email" className="etiqueta">
                Correo
              </label>
              <input
                id="form-email"
                type="email"
                className={`campo ${errorEmail ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: compras@empresa.com"
              />
              {errorEmail && (
                <p className="mt-1 font-semibold text-rose-600">
                  Ese correo no parece válido: debe tener una @.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="form-telefono" className="etiqueta">
                Teléfono / WhatsApp
              </label>
              <input
                id="form-telefono"
                type="tel"
                className="campo"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 300 123 4567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="form-direccion" className="etiqueta">
              Dirección
            </label>
            <input
              id="form-direccion"
              className="campo"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Calle 13 # 68-50, Bogotá"
            />
          </div>

          {editando && (
            <div>
              <label htmlFor="form-estado" className="etiqueta">
                Estado
              </label>
              <select
                id="form-estado"
                className="campo"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoEmpresa)}
              >
                {ESTADOS.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {ETIQUETA_ESTADO[opcion]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="form-notas" className="etiqueta">
              Notas
            </label>
            <textarea
              id="form-notas"
              className="campo"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Lo que quieras recordar de esta empresa"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primario">
            <Save className="h-5 w-5" aria-hidden="true" />
            {editando ? 'Guardar cambios' : 'Agregar empresa'}
          </button>
        </div>
      </form>
    </div>
  );
}

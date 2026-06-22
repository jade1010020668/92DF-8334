import { useState } from 'react';
import { HardHat, Lock } from 'lucide-react';
import type { Acceso } from '../lib/acceso';
import { claveCorrecta } from '../lib/acceso';

interface Props {
  acceso: Acceso;
  nombreEmpresa: string;
  onDesbloquear: () => void;
}

export function Login({ acceso, nombreEmpresa, onDesbloquear }: Props) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState(false);

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (claveCorrecta(clave, acceso)) {
      onDesbloquear();
    } else {
      setError(true);
      setClave('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 to-blue-600 p-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm space-y-5 rounded-3xl bg-white p-7 shadow-2xl"
        aria-label="Iniciar sesión"
      >
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <HardHat className="h-9 w-9" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-800">DotaciónPro</h1>
          <p className="text-slate-500">{nombreEmpresa}</p>
        </div>

        <div>
          <label htmlFor="login-clave" className="etiqueta flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-700" aria-hidden="true" />
            Ingresa tu clave
          </label>
          <input
            id="login-clave"
            type="password"
            inputMode="numeric"
            autoFocus
            autoComplete="current-password"
            className={`campo text-center text-2xl tracking-widest ${error ? 'border-rose-500 ring-2 ring-rose-200' : ''}`}
            value={clave}
            onChange={(e) => {
              setClave(e.target.value);
              setError(false);
            }}
            placeholder="••••"
          />
          {error && <p className="mt-1 font-semibold text-rose-600">Clave incorrecta. Intenta de nuevo.</p>}
        </div>

        <button type="submit" className="btn-primario w-full text-lg" disabled={!clave}>
          Entrar
        </button>

        <p className="text-center text-sm text-slate-400">
          Solo tú tienes esta clave. Si la olvidaste, pídele ayuda a Diego.
        </p>
      </form>
    </div>
  );
}

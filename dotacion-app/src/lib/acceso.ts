/**
 * Acceso con clave para que solo el dueño abra la app. Es un candado de
 * privacidad local (los datos viven en este navegador): práctico para que
 * nadie más que tome el equipo vea la información, no es seguridad de banco.
 */

export interface Acceso {
  /** Hash de la clave. Vacío = la app no está protegida. */
  claveHash: string;
  /** Mantener la sesión iniciada en este equipo. */
  recordar: boolean;
}

export const ACCESO_DEFAULT: Acceso = { claveHash: '', recordar: true };

export function combinarAcceso(guardado: unknown): Acceso {
  if (!guardado || typeof guardado !== 'object') return { ...ACCESO_DEFAULT };
  const g = guardado as Partial<Acceso>;
  return {
    claveHash: typeof g.claveHash === 'string' ? g.claveHash : '',
    recordar: typeof g.recordar === 'boolean' ? g.recordar : true,
  };
}

/**
 * Hash determinista de la clave (variante de djb2 + sal). No es criptográfico
 * —es un candado de conveniencia local— pero evita guardar la clave en claro.
 */
export function hashClave(clave: string): string {
  const texto = `dotacionpro::${clave}`;
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 33) ^ texto.charCodeAt(i);
  }
  // A entero sin signo y a base 36.
  return (h >>> 0).toString(36);
}

export function claveCorrecta(clave: string, acceso: Acceso): boolean {
  return acceso.claveHash !== '' && hashClave(clave) === acceso.claveHash;
}

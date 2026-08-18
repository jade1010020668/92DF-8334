import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/** Aviso global cuando el navegador no puede guardar (cuota llena / bloqueado). */
let avisarFalloGuardado: ((clave: string) => void) | null = null;
export function registrarAvisoFalloGuardado(fn: ((clave: string) => void) | null): void {
  avisarFalloGuardado = fn;
}

/**
 * Estado de React persistido en localStorage. `transformar` permite migrar /
 * sanear lo guardado. Sincroniza entre pestañas (evento `storage`) y avisa si
 * el navegador no puede guardar (cuota llena).
 */
export function useLocalStorageState<T>(
  clave: string,
  valorInicial: T,
  transformar?: (guardado: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const transformarRef = useRef(transformar);
  transformarRef.current = transformar;

  const leer = (): T => {
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo === null) return valorInicial;
      const parseado: unknown = JSON.parse(crudo);
      return transformarRef.current ? transformarRef.current(parseado) : (parseado as T);
    } catch {
      return valorInicial;
    }
  };

  const [valor, setValor] = useState<T>(leer);

  // Marca que el primer render no debe re-escribir lo que se acaba de leer.
  const montado = useRef(false);

  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Cuota llena o almacenamiento bloqueado: la app sigue en memoria y avisa.
      avisarFalloGuardado?.(clave);
    }
  }, [clave, valor]);

  // Sincronización entre pestañas: si otra pestaña cambia esta clave, refrescamos.
  useEffect(() => {
    const alCambiar = (evento: StorageEvent) => {
      if (evento.key !== clave || evento.newValue === null) return;
      try {
        const parseado: unknown = JSON.parse(evento.newValue);
        setValor(transformarRef.current ? transformarRef.current(parseado) : (parseado as T));
      } catch {
        // Valor inválido en la otra pestaña: se ignora.
      }
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, [clave]);

  return [valor, setValor];
}

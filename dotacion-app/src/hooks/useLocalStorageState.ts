import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Estado de React persistido en localStorage. `transformar` permite migrar /
 * sanear lo guardado (p. ej. combinar con defaults).
 */
export function useLocalStorageState<T>(
  clave: string,
  valorInicial: T,
  transformar?: (guardado: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo === null) return valorInicial;
      const parseado: unknown = JSON.parse(crudo);
      return transformar ? transformar(parseado) : (parseado as T);
    } catch {
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Si el navegador bloquea localStorage la app sigue funcionando en memoria.
    }
  }, [clave, valor]);

  return [valor, setValor];
}

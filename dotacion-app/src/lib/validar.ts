/** Validaciones de entrada para que no se guarden datos basura. */

// Estructura de correo razonable (no perfecta, pero descarta lo evidente).
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** ¿El correo tiene estructura válida? Vacío = válido (es opcional). */
export function correoValido(email: string): boolean {
  const e = email.trim();
  if (e === '') return true;
  return RE_CORREO.test(e);
}

/**
 * ¿El teléfono sirve para contactar? Vacío = válido (opcional). Rechaza
 * números demasiado cortos o "falsos" (todos iguales como 0000000000, 1111111).
 */
export function telefonoValido(telefono: string): boolean {
  const t = telefono.trim();
  if (t === '') return true;
  const d = t.replace(/\D/g, '');
  if (d.length < 7 || d.length > 13) return false;
  // Todos los dígitos iguales (0000000000, 1111111) no es un teléfono real.
  if (/^(\d)\1+$/.test(d)) return false;
  // Secuencias triviales.
  if (d === '1234567' || d === '12345678' || d === '1234567890') return false;
  return true;
}

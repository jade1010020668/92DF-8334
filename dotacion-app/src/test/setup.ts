import { afterEach, vi } from 'vitest';

// Este setup corre para TODOS los tests; solo activa lo del DOM cuando existe
// (los tests de lógica corren en node y no deben cargar testing-library).
const hayDom = typeof document !== 'undefined';

if (hayDom) {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
    try {
      localStorage.clear();
    } catch {
      // sin localStorage no hay nada que limpiar
    }
  });

  window.scrollTo = vi.fn();
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Atrapa cualquier error de render para que la app NUNCA quede en blanco:
 * muestra un mensaje claro y botones para recargar o reparar (borrar datos).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Queda en la consola por si hay que revisarlo.
    console.error('DotaciónPro — error atrapado:', error, info.componentStack);
  }

  private recargar = () => window.location.reload();

  private reparar = () => {
    const ok = window.confirm(
      'Esto borra la información guardada en este dispositivo (empresas, pedidos y configuración) ' +
        'para reparar la app. Solo hazlo si no carga de otra forma. ¿Continuar?',
    );
    if (!ok) return;
    try {
      localStorage.clear();
    } catch {
      // aunque falle, recargamos
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f1f5f9',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: '#fff',
            borderRadius: '18px',
            padding: '28px 24px',
            boxShadow: '0 12px 40px rgba(15,23,42,.12)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '44px', lineHeight: 1, marginBottom: '10px' }}>🛠️</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            La app tuvo un problema
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 20px', lineHeight: 1.5 }}>
            No te preocupes, tu información sigue guardada. Toca <b>«Recargar»</b> para volver a abrirla.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={this.recargar}
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recargar la app
            </button>
            <button
              type="button"
              onClick={this.reparar}
              style={{
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              No carga: reparar (borra los datos de este equipo)
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '16px 0 0' }}>
            Si sigue fallando, escribe y te ayudo.
          </p>
        </div>
      </div>
    );
  }
}

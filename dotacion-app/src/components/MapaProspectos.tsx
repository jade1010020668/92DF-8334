import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PinMapa {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  /** 1 = alta (verde), 2 = media (azul), 3/otros = gris. */
  prioridad?: 1 | 2 | 3;
  /** Texto bajo el nombre en el globo (categoría, distancia…). */
  detalle?: string;
}

interface Props {
  /** Punto del negocio (marcador especial naranja). */
  negocio?: { lat: number; lon: number; nombre: string };
  pines: PinMapa[];
  /** Alto del mapa en clases Tailwind (p. ej. 'h-80' o 'h-[28rem]'). */
  alturaClase?: string;
  /** Se llama al hacer clic en el botón del globo de un pin. */
  onSeleccionar?: (id: string) => void;
  textoBotonPin?: string;
}

const COLOR_PIN: Record<number, string> = { 1: '#047857', 2: '#334155', 3: '#94a3b8' };

function iconoCirculo(color: string, radio = 11): L.DivIcon {
  return L.divIcon({
    className: 'pin-dotacion',
    html: `<span style="display:block;width:${radio * 2}px;height:${radio * 2}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [radio * 2, radio * 2],
    iconAnchor: [radio, radio],
  });
}

function escapar(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

export function MapaProspectos({
  negocio,
  pines,
  alturaClase = 'h-96',
  onSeleccionar,
  textoBotonPin = 'Agregar a mi lista',
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const onSeleccionarRef = useRef(onSeleccionar);
  onSeleccionarRef.current = onSeleccionar;

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return;
    const nodo = contenedor.current;
    let mapa: L.Map;
    try {
      // Animaciones desactivadas: evitan errores async (_leaflet_pos) si se
      // cambia de pestaña mientras el mapa anima un zoom/desvanecido.
      mapa = L.map(nodo, {
        scrollWheelZoom: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView([4.5855, -74.1355], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapa);
      capaRef.current = L.layerGroup().addTo(mapa);
      mapaRef.current = mapa;
    } catch (error) {
      console.warn('Mapa: no se pudo iniciar (se ignora).', error);
      return;
    }

    // El contenedor puede montarse con tamaño 0 (carga diferida): recalcular.
    const t = setTimeout(() => {
      try {
        if (nodo.isConnected) mapa.invalidateSize(false);
      } catch {
        /* ignorar */
      }
    }, 200);

    // Delegación: los botones "agregar" del globo emiten un evento personalizado.
    const alClic = (e: Event) => {
      const id = (e.target as HTMLElement)?.getAttribute?.('data-pin-id');
      if (id) onSeleccionarRef.current?.(id);
    };
    nodo.addEventListener('click', alClic);

    return () => {
      clearTimeout(t);
      nodo.removeEventListener('click', alClic);
      try {
        mapa.remove();
      } catch {
        /* ignorar errores al desmontar */
      }
      mapaRef.current = null;
      capaRef.current = null;
    };
  }, []);

  // Redibujar marcadores cuando cambian los datos. Todo va protegido: un error
  // de Leaflet (p. ej. al cambiar de pestaña mientras se dibuja) NO debe romper
  // la app ni dejar la pantalla en blanco.
  useEffect(() => {
    const mapa = mapaRef.current;
    const capa = capaRef.current;
    if (!mapa || !capa) return;
    // Si el contenedor ya no está en la página, no intentamos dibujar.
    const cont = mapa.getContainer();
    if (!cont || !cont.isConnected) return;
    try {
      capa.clearLayers();
      const puntos: L.LatLngExpression[] = [];

      if (negocio && Number.isFinite(negocio.lat) && Number.isFinite(negocio.lon)) {
        L.marker([negocio.lat, negocio.lon], { icon: iconoCirculo('#d97706', 13), zIndexOffset: 1000 })
          .bindPopup(`<strong>${escapar(negocio.nombre)}</strong><br/>📍 Tu negocio`)
          .addTo(capa);
        puntos.push([negocio.lat, negocio.lon]);
      }

      for (const p of pines) {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
        const color = COLOR_PIN[p.prioridad ?? 3] ?? COLOR_PIN[3];
        const boton = onSeleccionarRef.current
          ? `<button data-pin-id="${escapar(p.id)}" style="margin-top:6px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer">${escapar(textoBotonPin)}</button>`
          : '';
        L.marker([p.lat, p.lon], { icon: iconoCirculo(color) })
          .bindPopup(
            `<strong>${escapar(p.nombre)}</strong>${p.detalle ? `<br/>${escapar(p.detalle)}` : ''}${boton}`,
          )
          .addTo(capa);
        puntos.push([p.lat, p.lon]);
      }

      if (puntos.length > 0) {
        mapa.invalidateSize(false);
        if (puntos.length === 1) {
          mapa.setView(puntos[0], 15, { animate: false });
        } else {
          mapa.fitBounds(L.latLngBounds(puntos).pad(0.2), { maxZoom: 16, animate: false });
        }
      }
    } catch (error) {
      console.warn('Mapa: no se pudo redibujar (se ignora para no romper la app).', error);
    }
  }, [negocio, pines, textoBotonPin]);

  return (
    <div
      ref={contenedor}
      className={`w-full ${alturaClase} overflow-hidden rounded-2xl border border-slate-200`}
      role="application"
      aria-label="Mapa de empresas"
    />
  );
}

# DotaciónPro — versión web (JavaScript plano)

App vigente de DotaciónPro para **Dotaciones El Manantial S.A.S**. Reconstrucción
del 21 de julio de 2026: una sola página en JavaScript plano, sin build ni
framework, fácil de editar. **Esta es la versión que está EN VIVO** en el Hugging
Face Space `MORALES101002/dotacionpro` — https://morales101002-dotacionpro.static.hf.space/

> La carpeta `dotacion-app/` (React + Vite) es la versión anterior y queda archivada.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de las 6 vistas + PIN + modales |
| `app.js` | Toda la lógica (empresas en IndexedDB, pedidos, mapa, correo, PDF) |
| `style.css` | Estilos |
| `catalogo-datos.js` | Catálogo de productos y datos de la empresa (`window.CATALOGO`, `window.EMPRESA_INFO`) |
| `catalogo.html` | Catálogo premium imprimible/compartible |
| `empresas-bogota.json` | Base de 13.950 empresas (11.031 con correo) |
| `manifest.webmanifest`, `favicon.svg`, `icono-*.png` | PWA (instalable en el celular) |

## Cómo probar en local

```bash
cd web && python3 -m http.server 8000   # abrir http://localhost:8000
```

## Cómo desplegar (a Hugging Face Space)

**Automático.** Cada push a esta carpeta dispara
`.github/workflows/publicar-hf-space.yml`, que sube `web/` al Space
`MORALES101002/dotacionpro`. Requiere el secreto `HF_TOKEN` del repositorio
(Settings → Secrets and variables → Actions), con un token de Hugging Face con
permiso de **escritura**. También se puede lanzar a mano desde la pestaña
Actions → «Publicar la app en Hugging Face Space» → Run workflow.

> ⚠️ Dos cosas que **no** hay que cambiar sin pensarlo:
> - El `README.md` de esta carpeta **no se sube**: el README del Space es su
>   archivo de configuración (`sdk: static`) y pisarlo tumba el sitio.
> - El despliegue borra y rehace `assets/*` en el Space (limpia los restos del
>   build de React de la etapa anterior). Las fotos de producto viven en
>   `web/assets/*.png` y se suben en el mismo commit.

## Dependencias (CDN, se cargan en el navegador del usuario)

Leaflet (mapa), jsPDF + autotable (cotización PDF), SheetJS/xlsx (Excel). No hay
paso de compilación: lo que ves es lo que corre.

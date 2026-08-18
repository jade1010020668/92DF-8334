# Reporte de sesión — DotaciónPro

App **en vivo y funcional**: https://morales101002-dotacionpro.static.hf.space
Catálogo público (brochure): https://morales101002-dotacionpro.static.hf.space/catalogo.html

## Qué es
Aplicación web (React 19 + TypeScript + Vite + Tailwind, 100 % frontend, datos en
localStorage del navegador) para **Dotaciones El Manantial** (Carrera 34 # 2-62,
Bogotá): consigue clientes cerca del negocio, envía cotizaciones por
Gmail/WhatsApp/Brevo, y controla pedidos y cobros.

## Estado: COMPLETO y verificado
- **239 pruebas verdes** (20 archivos): 227 de lógica pura + 12 de integración que
  montan la app real y ejecutan flujos completos (agregar empresa, crear pedido,
  campaña, ficha/historial, configuración, persistencia).
- **Build de producción** OK. Paquete inicial **328 KB** (Excel, PDF y mapa se
  cargan solo cuando se usan).
- **CI** (`.github/workflows/ci.yml`) corre pruebas + build en cada push.
- **Despliegue automático** a Hugging Face Spaces (`.github/workflows/publicar-hf-space.yml`,
  requiere secreto `HF_TOKEN`).

## Funcionalidades
- **Buscar clientes cerca del negocio**: geolocaliza la dirección de Configuración
  y trae empresas que necesitan dotación (talleres, ferreterías, fábricas…) en
  radio de 2/5/10 km, ordenadas por prioridad y distancia. Probado: 307 prospectos
  reales a <5 km de la Cra 34 #2-62, el más cercano a 96 m.
- **Mapa visual interactivo** (Leaflet): prospectos como puntos de colores
  (verde=alta, azul=media, naranja=negocio); clic para agregar.
- **Empresas**: lista con buscador/filtros, estados, importar/exportar Excel,
  ficha con historial de gestión (correos, llamadas, notas, pedidos con fecha).
- **Pedidos**: líneas de producto, IVA, abono, saldo por cobrar, fecha de entrega,
  estados, KPIs de ventas/cobros, aviso de entregas, PDF por pedido.
- **Mensajes**: correo y WhatsApp automáticos o con plantilla personalizable;
  envío real por Brevo con PDF de cotización adjunto.
- **Estadísticas**: tasas de respuesta/conversión, sectores, ventas y por cobrar.
- **Respaldo completo** (empresas + pedidos + config) entre dispositivos;
  sincronización entre pestañas; aviso si el navegador se queda sin espacio.

## Arquitectura de datos (localStorage)
- `dotacionpro.empresas` — empresas con estados, fechas, coordenadas e historial.
- `dotacionpro.pedidos` — pedidos con líneas, IVA, abono, estado.
- `dotacionpro.config` — datos del negocio, catálogo, plantillas, claves API.
- `dotacionpro.consecutivoCotizacion`, `dotacionpro.ultimaExportacion`.

## Pendientes del dueño (no son código)
1. Mergear el PR de la rama `claude/intelligent-cannon-rlgn1v`.
2. Rotar el token de Hugging Face usado en la sesión y guardarlo como secreto
   `HF_TOKEN` en GitHub.
3. En la app → Configuración: teléfono, correo y quién firma.
4. Importar el Excel inicial de prospectos (`datos/` del repo) o buscar en el mapa.
5. Opcional: clave de Google Maps (más teléfonos) y de Brevo (envío automático).

## Próximas mejoras posibles (no bloquean el uso)
- Vista de mapa con TODAS las empresas propias (geocodificando las que no tienen
  coordenadas) para planear rutas de visita.
- Sincronización en nube en tiempo real (requiere backend, p. ej. Supabase).
- Detección de correos rebotados vía la API de eventos de Brevo.

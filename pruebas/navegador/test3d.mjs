import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// playwright puede estar como dependencia local o instalado global.
let pw;
try { pw = require('playwright'); }
catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;

// Ruta del navegador: variable de entorno > el chromium de esta máquina > el que
// trae playwright (undefined = que lo resuelva él). Así corre igual en CI.
// Se usa require('fs') y no un import: varias suites ya importan de 'fs' y un
// segundo import del mismo nombre es error de sintaxis.
const EXEC = process.env.PW_CHROMIUM
  || (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIR = new URL('../../web', import.meta.url).pathname;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = join(DIR, p);
  if (p === '/' || !existsSync(file) || statSync(file).isDirectory()) file = join(DIR, 'catalogo3d.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4511, r));

const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: EXEC, args: ['--ignore-certificate-errors', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.setDefaultTimeout(15000);
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
let waUrl = null;
await page.exposeFunction('__noop', () => {});
await page.addInitScript(() => { window.open = (u) => { window.__waUrl = u; return null; }; });

await page.goto('http://localhost:4511/catalogo3d.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

check('Título y marca visibles', await page.getByText('Dotaciones El Manantial').first().isVisible());
check('Canvas 3D creado (WebGL arrancó)', await page.locator('#mount canvas').count() === 1);
check('Producto inicial: Camisa de trabajo', await page.locator('#i-nombre').textContent().then(x => /Camisa de trabajo/.test(x)));
check('Nota "desde la foto real" visible (producto con foto)', await page.locator('#bloque-foto').isVisible());
check('Colores OCULTOS para producto con foto', !(await page.locator('#bloque-colores').isVisible()));
check('8 productos en el catálogo', await page.locator('.card').count() === 8);
check('Precio visible', await page.locator('#i-precio').textContent().then(t => /\$\s?41\.500/.test(t)));

// El casco ya es foto real: debe OCULTAR los colores (la foto muestra la tela real)
await page.locator('.card[data-id="casco"]').click();
await page.waitForTimeout(1200);
check('Cambio a Casco de seguridad', await page.locator('#i-nombre').textContent().then(x => /Casco de seguridad/.test(x)));
check('Colores OCULTOS para el casco (ahora es foto real)', !(await page.locator('#bloque-colores').isVisible()));
check('Precio actualizado a $24.500', await page.locator('#i-precio').textContent().then(t => /24\.500/.test(t)));

// Overol es el único que sigue siendo modelo 3D construido → colores visibles
await page.locator('.card[data-id="overol"]').click();
await page.waitForTimeout(1200);
check('Colores VISIBLES para modelo 3D construido (overol)', await page.locator('#bloque-colores').isVisible());

// Elegir color y talla
await page.locator('.swatch[data-i="4"]').click();
await page.waitForTimeout(400);
check('Color "Naranja seguridad" seleccionado', await page.locator('#i-color').textContent().then(t => /Naranja/.test(t)));
await page.locator('.size-btn[data-i="3"]').click();
await page.waitForTimeout(300);
check('Talla XL seleccionada', await page.locator('.size-btn.on').textContent().then(t => t === 'XL'));

// Pausar rotación
await page.locator('#btn-rotar').click();
await page.waitForTimeout(300);

// Solicitar cotización → WhatsApp con el mensaje armado
await page.locator('#btn-cotizar').click();
await page.waitForTimeout(400);
waUrl = await page.evaluate(() => window.__waUrl);
check('Botón cotizar abre WhatsApp del negocio', !!waUrl && waUrl.includes('wa.me/573135745063'));
const msg = waUrl ? decodeURIComponent(waUrl.split('text=')[1]) : '';
check('Mensaje incluye producto, talla y color', /Overol enterizo/.test(msg) && /Talla: XL/.test(msg) && /Naranja seguridad/.test(msg));

// Overol (modelo construido nuevo) y pantalón (segunda foto)
await page.locator('.card[data-id="overol"]').click();
await page.waitForTimeout(1000);
check('Overol enterizo carga', await page.locator('#i-nombre').textContent().then(x => /Overol enterizo/.test(x)));
await page.locator('.card[data-id="pantalon"]').click();
await page.waitForTimeout(1500);
check('Pantalón (foto real) carga', await page.locator('#i-nombre').textContent().then(x => /Pantalón de trabajo/.test(x)));

await browser.close();
server.close();
const errReales = errors.filter(e => !/favicon|swiftshader|GroupMarkerNotSet|fonts\.g|ERR_CONNECTION_RESET/i.test(e));
check('Sin errores de página', errReales.length === 0);
errReales.slice(0, 5).forEach((e) => console.log('   -', e.slice(0, 160)));
const fail = results.filter(([, o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

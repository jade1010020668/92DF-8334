import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// playwright puede estar como dependencia local o instalado global.
let pw;
try { pw = require('playwright'); }
catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIR = new URL('../../web', import.meta.url).pathname;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = join(DIR, p);
  if (p === '/' || !existsSync(file) || statSync(file).isDirectory()) file = join(DIR, 'catalogo.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4515, r));

const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// Desde el catálogo de precios, clic en el casco
await page.goto('http://localhost:4515/catalogo.html', { waitUntil: 'load' });
await page.waitForTimeout(700);
await page.locator('.item.con3d', { hasText: 'Casco' }).first().locator('.sello3d').click();
await page.waitForURL(/p=casco&solo=1/);
await page.waitForTimeout(2200);

check('Abre en modo SOLO IMAGEN (?solo=1)', page.url().includes('solo=1'));
check('Canvas 3D a pantalla completa', await page.locator('#mount canvas').count() === 1);
check('NO se ve el precio', !(await page.locator('.cta').isVisible()));
check('NO se ve el catálogo de abajo', !(await page.locator('.scroll').isVisible()));
check('NO se ve el encabezado', !(await page.locator('.header').isVisible()));
check('Nombre del producto flotante visible', await page.locator('#nombre-solo').isVisible());
check('Nombre correcto: Casco de seguridad', await page.locator('#nombre-solo').textContent().then(t => /Casco/.test(t)));
check('Botón ✕ para volver visible', await page.locator('#btn-cerrar-solo').isVisible());
check('Controles de girar/reiniciar siguen', await page.locator('#btn-rotar').isVisible());

// El ✕ vuelve al catálogo de precios
await page.locator('#btn-cerrar-solo').click();
await page.waitForTimeout(900);
check('✕ vuelve al catálogo de precios', page.url().includes('catalogo.html') && !page.url().includes('3d'));

// La página completa (sin solo=1) sigue intacta para uso directo
await page.goto('http://localhost:4515/catalogo3d.html?p=bota', { waitUntil: 'load' });
await page.waitForTimeout(2000);
check('Sin solo=1, la página completa sigue normal (precio visible)', await page.locator('.cta').isVisible());

await browser.close();
server.close();
const errReales = errors.filter(e => !/ERR_CONNECTION_RESET|fonts/i.test(e));
check('Sin errores de página', errReales.length === 0);
errReales.slice(0,4).forEach(e => console.log('  -', e.slice(0,140)));
const fail = results.filter(([,o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

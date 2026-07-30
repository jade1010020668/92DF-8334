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
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = join(DIR, p);
  if (p === '/' || !existsSync(file) || statSync(file).isDirectory()) file = join(DIR, 'catalogo.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4518, r));
const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.on('pageerror', (e) => errors.push(e.message));
let printed = false;
await page.addInitScript(() => { window.print = () => { window.__printed = true; }; });
await page.goto('http://localhost:4518/catalogo.html', { waitUntil: 'load' });
await page.waitForTimeout(800);

check('Buscador visible', await page.locator('#buscador').isVisible());
check('Botón Guardar PDF visible', await page.locator('#btn-pdf').isVisible());
check('Sección "¿Cómo pedir?" con 3 pasos', await page.locator('.paso-p').count() === 3);
check('Franja de confianza (5 sellos)', await page.locator('.confianza span').count() === 5);

// buscar "bota"
await page.locator('#buscador').fill('bota');
await page.waitForTimeout(300);
const visibles = await page.evaluate(() => Array.from(document.querySelectorAll('.item')).filter(i => i.style.display !== 'none').length);
check(`Buscar "bota" filtra (visibles: ${visibles}, esperado 4)`, visibles === 4);
const catsVisibles = await page.evaluate(() => Array.from(document.querySelectorAll('section.cat')).filter(s => s.style.display !== 'none').length);
check(`Solo queda la categoría de botas (${catsVisibles})`, catsVisibles === 1);

// sin resultados
await page.locator('#buscador').fill('xyzabc');
await page.waitForTimeout(300);
check('Mensaje "no encontramos" aparece', await page.locator('#sin-resultados').isVisible());
// limpiar
await page.locator('#buscador').fill('');
await page.waitForTimeout(300);
const todos = await page.evaluate(() => Array.from(document.querySelectorAll('.item')).filter(i => i.style.display !== 'none').length);
check(`Limpiar búsqueda restaura los 35`, todos === 35);

// PDF
await page.locator('#btn-pdf').click();
await page.waitForTimeout(200);
check('Botón PDF dispara impresión', await page.evaluate(() => window.__printed === true));

// lo anterior sigue: pedido + 3D
check('Botones "+" siguen (31)', await page.locator('.btn-mas').count() === 31);
check('Sellos 3D siguen (14)', await page.locator('.sello3d').count() === 14);

await browser.close();
server.close();
const errReales = errors.filter(e => !/ERR_CONNECTION_RESET|fonts/i.test(e));
check('Sin errores de página', errReales.length === 0);
errReales.slice(0,4).forEach(e => console.log('  -', e.slice(0,140)));
const fail = results.filter(([,o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

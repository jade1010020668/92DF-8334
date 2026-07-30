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
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = join(DIR, p);
  if (p === '/' || !existsSync(file) || statSync(file).isDirectory()) file = join(DIR, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4520, r));
const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.setDefaultTimeout(30000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => { window.open = (u) => { window.__waUrl = u; return null; }; });

// ===== LA APP: cargar base v3 con clasificación =====
await page.goto('http://localhost:4520/index.html', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.locator('.tab[data-view="empresas"]').click();
await page.waitForTimeout(400);
check('Filtro nuevo "Compran dotación" visible', await page.locator('#emp-solo-dotacion').count() === 1);
await page.locator('#btn-cargar-bogota').click();
await page.waitForTimeout(26000); // 18.6k filas a IndexedDB tarda
const conteo = await page.locator('#emp-count').textContent().catch(()=> '');
check(`Base v3 cargada en la app (${conteo.trim()})`, /18\.?\d{3}/.test(conteo.replace(/[, ]/g,'')) || /de 18/.test(conteo));
// filtro dotación
await page.locator('#emp-solo-dotacion').check();
await page.waitForTimeout(1500);
const conteo2 = await page.locator('#emp-count').textContent();
check(`Filtro "Compran dotación" filtra (~5.000): ${conteo2.trim()}`, /5\.?0\d{2}/.test(conteo2.replace(/[, ]/g,'')) || /Mostrando 5/.test(conteo2));

// ===== CATÁLOGO: formulario llámenme + validez =====
await page.goto('http://localhost:4520/catalogo.html', { waitUntil: 'load' });
await page.waitForTimeout(800);
check('Sección "¿Prefiere que lo llamemos?" visible', await page.locator('#llamenos').isVisible());
check('Nota de precios vigentes 2026', await page.getByText(/vigentes 2026/).first().isVisible());
// validación de celular
await page.locator('#ll-enviar').click();
await page.waitForTimeout(200);
check('Valida celular vacío', await page.locator('#ll-nota').textContent().then(t => /celular válido/.test(t)));
await page.locator('#ll-nombre').fill('Ferretería La 34');
await page.locator('#ll-tel').fill('3001234567');
await page.locator('#ll-enviar').click();
await page.waitForTimeout(300);
const wa = await page.evaluate(() => window.__waUrl);
check('Solicitud llega al WhatsApp del negocio', !!wa && wa.includes('wa.me/573135745063'));
const msg = wa ? decodeURIComponent(wa.split('text=')[1]) : '';
check('Mensaje trae nombre y celular del cliente', /Ferretería La 34/.test(msg) && /3001234567/.test(msg));
check('Confirmación honesta (pulse ENVIAR)', await page.locator('#ll-nota').textContent().then(t => /pulse ENVIAR/.test(t)));

await browser.close();
server.close();
const errReales = errors.filter(e => !/ERR_CONNECTION_RESET|fonts/i.test(e));
check('Sin errores de página', errReales.length === 0);
errReales.slice(0,4).forEach(e => console.log('  -', e.slice(0,140)));
const fail = results.filter(([,o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

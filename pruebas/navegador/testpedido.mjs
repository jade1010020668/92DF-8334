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
await new Promise((r) => server.listen(4517, r));

const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.addInitScript(() => { window.open = (u) => { window.__waUrl = u; return null; }; });

await page.goto('http://localhost:4517/catalogo.html', { waitUntil: 'load' });
await page.waitForTimeout(900);

// PASO 1: vista previa OG
const og = await page.evaluate(() => ({
  img: document.querySelector('meta[property="og:image"]')?.content || '',
  title: document.querySelector('meta[property="og:title"]')?.content || '',
}));
check('OG image apunta a og-catalogo.jpg', og.img.includes('og-catalogo.jpg'));
check('OG title con el nombre del negocio', /Manantial/.test(og.title));
check('og-catalogo.jpg servida correctamente', await page.evaluate(async () => (await fetch('./og-catalogo.jpg')).ok));

// PASO 2/3: botones + y pedido
const nMas = await page.locator('.btn-mas').count();
check(`31 botones "+" (productos, sin servicios de bordado) → hay ${nMas}`, nMas === 31);
check('Barra de pedido oculta al inicio', !(await page.locator('.barra-pedido.visible').count()));

// Agregar 2 productos con cantidades
await page.locator('.btn-mas').first().click();     // overol 2 piezas 58.500
await page.locator('.btn-mas').first().click();     // x2
await page.locator('.btn-mas').nth(4).click();      // chaleco periodista 41.500
await page.waitForTimeout(400);
check('Barra visible tras agregar', await page.locator('.barra-pedido.visible').count() === 1);
const barraTxt = await page.locator('#bp-titulo').textContent();
check(`Barra dice 2 productos · 3 und ("${barraTxt.trim()}")`, /2 productos/.test(barraTxt) && /3 und/.test(barraTxt));
const subTxt = await page.locator('#bp-sub').textContent();
check('Total estimado correcto ($158.500)', /158\.500/.test(subTxt));

// Panel: ver, subir cantidad, total actualiza
await page.locator('#bp-ver').click();
await page.waitForTimeout(300);
check('Panel del pedido abre', await page.locator('.panel-pedido.abierto').count() === 1);
await page.locator('.ped-fila [data-mas]').nth(1).click(); // chaleco x2
await page.waitForTimeout(200);
check('Total sube a $200.000', await page.locator('#pp-total').textContent().then(t => /200\.000/.test(t)));

// Enviar por WhatsApp
await page.locator('#pp-wa').click();
await page.waitForTimeout(300);
const wa = await page.evaluate(() => window.__waUrl);
check('WhatsApp al número del negocio', !!wa && wa.includes('wa.me/573135745063'));
const msg = wa ? decodeURIComponent(wa.split('text=')[1]) : '';
check('Mensaje con cantidades y total', /2 × Overol 2 piezas/.test(msg) && /2 × Chaleco/.test(msg) && /200\.000/.test(msg));

// Persistencia: recargar y el pedido sigue
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(700);
check('Pedido persiste tras recargar', await page.locator('.barra-pedido.visible').count() === 1);

// El 3D sigue funcionando (nombre clickeable)
await page.locator('.item.con3d .sello3d').first().click();
await page.waitForURL(/catalogo3d\.html\?p=.*solo=1/);
check('Enlace 3D sigue funcionando', true);

await browser.close();
server.close();
const errReales = errors.filter(e => !/ERR_CONNECTION_RESET|fonts/i.test(e));
check('Sin errores de página', errReales.length === 0);
errReales.slice(0,4).forEach(e => console.log('  -', e.slice(0,140)));
const fail = results.filter(([,o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

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
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIR, 'catalogo.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4516, r));

const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });

// Verificar que la clase 'solo' está puesta ANTES del primer render
// (en domcontentloaded, incluso antes de que cargue three.js)
let claseTemprana = null, ctaOcultaTemprano = null;
page.on('domcontentloaded', async () => {
  try {
    claseTemprana = await page.evaluate(() => document.documentElement.classList.contains('solo'));
    ctaOcultaTemprano = await page.evaluate(() => {
      const el = document.querySelector('.cta');
      return el ? getComputedStyle(el).display === 'none' : null;
    });
  } catch {}
});
await page.goto('http://localhost:4516/catalogo3d.html?p=casco&solo=1', { waitUntil: 'load' });
await page.waitForTimeout(1800);

check('Clase "solo" activa ANTES de pintar (domcontentloaded)', claseTemprana === true);
check('El precio ya estaba oculto desde el primer instante', ctaOcultaTemprano === true);
check('Vista final: solo la imagen 3D', await page.locator('#mount canvas').count() === 1 && !(await page.locator('.cta').isVisible()));
check('✕ visible', await page.locator('#btn-cerrar-solo').isVisible());

await browser.close();
server.close();
const fail = results.filter(([,o]) => !o);
console.log(`\n${results.length - fail.length}/${results.length} OK`);
console.log(fail.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(fail.length === 0 ? 0 : 1);

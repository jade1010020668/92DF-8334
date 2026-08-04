// Prueba del panel del motor (apps_script/PanelMotor.html) en Chromium real.
// El archivo se sirve TAL CUAL se publica en Apps Script; lo único doblado es
// google.script.run, que en producción pone Google y aquí pone la prueba.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); }
catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;

const EXEC = process.env.PW_CHROMIUM
  || (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

import { createServer } from 'http';
import { readFileSync } from 'fs';
const DIR = new URL('../../apps_script', import.meta.url).pathname;
const server = createServer((req, res) => {
  try {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(DIR + '/PanelMotor.html'));
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(4521, r));

const results = [];
const check = (n, c) => { results.push([n, !!c]); console.log(`${c ? '✅' : '❌'} ${n}`); };
const errors = [];
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 412, height: 880 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  window.__estado = {
    activado: true, pausado: false, diaRampa: 5, cupoHoy: 20, techo: 40,
    cuotaGmail: 92, ganchoLegal: '31 de agosto',
    conteos: { pendientes: 10984, enviadas: 120, toque2: 40, respondieron: 12,
               cotizadas: 5, ventas: 2, rebotes: 3, bajas: 1, invalidos: 4 },
    diasParaAgotar: 550, correoAvisos: 'dotaciones@gmail.com',
    eventos: [
      { fecha: '04/08 08:01', evento: 'envio', detalle: 'Nuevos: 14 · 2º toque: 6 · cupo: 20' },
      { fecha: '04/08 07:50', evento: 'motor', detalle: 'reanudado desde el panel' },
    ],
  };
  window.__llamadas = [];
  window.__fallar = false;
  function runner() {
    const ctx = {};
    const r = {
      withSuccessHandler(cb) { ctx.ok = cb; return r; },
      withFailureHandler(cb) { ctx.err = cb; return r; },
      apiPanel() {
        window.__llamadas.push(['apiPanel']);
        setTimeout(() => window.__fallar
          ? ctx.err(new Error('sin red'))
          : ctx.ok(JSON.parse(JSON.stringify(window.__estado))), 15);
      },
      apiAccion(a) {
        window.__llamadas.push(['apiAccion', a]);
        setTimeout(() => {
          if (window.__fallar) return ctx.err(new Error('sin red'));
          const e = window.__estado;
          if (a === 'pausar') e.pausado = true;
          if (a === 'reanudar') e.pausado = false;
          if (a === 'activar') e.activado = true;
          ctx.ok(JSON.parse(JSON.stringify(e)));
        }, 15);
      },
    };
    return r;
  }
  window.google = { script: {} };
  Object.defineProperty(window.google.script, 'run', { get: runner });
});

await page.goto('http://localhost:4521/');
await page.waitForSelector('#estado-motor', { state: 'visible' });

// 1. Estado sano
check('Estado "Trabajando solo" con foco verde',
  await page.locator('#estado-titulo').textContent() === 'Trabajando solo'
  && await page.locator('#foco').getAttribute('class') === 'foco-verde');
check('Banda del gancho legal VISIBLE con la fecha vigente',
  await page.locator('#banda-gancho').isVisible()
  && /31 de agosto/.test(await page.locator('#banda-gancho').textContent()));
check('KPIs: cupo 20, día 5 de rampa',
  await page.locator('#k-cupo').textContent() === '20'
  && await page.locator('#k-dia').textContent() === '5');
check('Pendientes con separador de miles',
  /10[.,]984/.test(await page.locator('#k-pend').textContent()));

// 2. Embudo con la suma correcta (120+40+12+5+2 contactadas)
const embudo = await page.locator('#embudo').textContent();
check('Embudo: contactadas=179 y ventas=2', /179/.test(embudo) && /Ventas2/.test(embudo.replace(/\s/g, '')));
check('Renglón de salud: rebotes, bajas, inválidos y cuota',
  /Rebotes: 3 .* Bajas: 1 .* inválidos: 4 .* 92/.test(await page.locator('#renglon-salud').textContent()));
check('Estimación de días para agotar la lista',
  /550/.test(await page.locator('#renglon-agotar').textContent()));

// 3. Registro
check('Registro muestra los movimientos', /Nuevos: 14/.test(await page.locator('#registro').textContent()));

// 4. Pausar (confirm se acepta) y reanudar
await page.locator('#btn-pausa').click();
await page.waitForFunction(() => document.getElementById('estado-titulo').textContent === 'Pausado');
check('Pausar: estado "Pausado" y cupo 0',
  await page.locator('#k-cupo').textContent() === '0');
check('El botón cambió a "Reanudar"', /Reanudar/.test(await page.locator('#btn-pausa').textContent()));
check('La orden llegó como apiAccion(pausar)',
  await page.evaluate(() => JSON.stringify(window.__llamadas.at(-1))) === '["apiAccion","pausar"]');

await page.locator('#btn-pausa').click();
await page.waitForFunction(() => document.getElementById('estado-titulo').textContent === 'Trabajando solo');
check('Reanudar devuelve el motor a "Trabajando solo"', true);

// 5. Estado "Sin activar" → botón de activar visible y funcional
// (sin reload: recargar re-ejecuta el init script y resetea el estado doblado)
await page.evaluate(() => { window.__estado.activado = false; });
await page.locator('#btn-refrescar').click();
await page.waitForFunction(() => document.getElementById('estado-titulo').textContent === 'Sin activar');
check('Sin triggers: estado "Sin activar" y botón Activar visible',
  await page.locator('#estado-titulo').textContent() === 'Sin activar'
  && await page.locator('#btn-activar').isVisible());
await page.locator('#btn-activar').click();
await page.waitForFunction(() => document.getElementById('estado-titulo').textContent === 'Trabajando solo');
check('Activar crea los horarios y el panel lo refleja', !(await page.locator('#btn-activar').isVisible()));

// 6. Falla de red: error claro y botón de refrescar como salida
await page.evaluate(() => { window.__fallar = true; });
await page.locator('#btn-refrescar').click();
await page.waitForSelector('#zona-error', { state: 'visible' });
check('Sin red: aviso claro con "Refrescar" como salida',
  /No se pudo hablar con el motor/.test(await page.locator('#zona-error').textContent()));
await page.evaluate(() => { window.__fallar = false; });
await page.locator('#btn-refrescar').click();
await page.waitForFunction(() => document.getElementById('zona-error').style.display === 'none');
check('Al volver la red, el panel se recupera solo', true);

check('Sin errores de página', errors.length === 0);
if (errors.length) console.log('ERRORES:', errors);

await browser.close();
server.close();
const ok = results.filter(([, c]) => c).length;
console.log(`${ok}/${results.length} OK`);
console.log(ok === results.length ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(0);

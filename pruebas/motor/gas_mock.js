/**
 * Simulador del entorno Google Apps Script para probar MotorVentas.gs en Node.
 * Uso:  const sim = require('./gas_mock.js'); sim.instalar(); sim.cargarMotor();
 *       …manipular sim.estado…  → llamar funciones globales del motor.
 */
const fs = require('fs');
const MOTOR = require('path').join(__dirname, '..', '..', 'apps_script', 'MotorVentas.gs');

const estado = {
  hojas: {},            // nombre → {filas: [[...]], validaciones: true}
  correosEnviados: [],  // {to, subject, body, opts}
  hilos: [],            // hilos que devolverá GmailApp.search: {id, mensajes:[{from, cuerpo, starred}], importante}
  props: {},
  cuotaGmail: 100,
  ahora: new Date('2026-07-27T13:00:00Z'), // lunes 8am Bogotá
  triggers: [],
  alertasUi: [],
};

function hoja(nombre) {
  if (!estado.hojas[nombre]) estado.hojas[nombre] = { filas: [] };
  const h = estado.hojas[nombre];
  return {
    getLastRow: () => h.filas.length,
    appendRow: (fila) => h.filas.push([...fila]),
    setFrozenRows: () => {},
    getRange: function (a, b, c, d) {
      if (typeof a === 'string') return rango(h, 0, 0, 100000, 10); // 'E2:E20000' → solo validación
      return rango(h, a - 1, b - 1, c || 1, d || 1);
    },
    getDataRange: () => ({ getValues: () => h.filas.map(f => [...f]) }),
  };
}
function rango(h, fila, col, nf, nc) {
  return {
    setValue: (v) => { while (h.filas.length <= fila) h.filas.push([]); while (h.filas[fila].length <= col) h.filas[fila].push(''); h.filas[fila][col] = v; },
    getValue: () => (h.filas[fila] || [])[col] ?? '',
    setFontWeight: function () { return this; }, setBackground: function () { return this; },
    setFontColor: function () { return this; }, setDataValidation: function () { h.validaciones = true; return this; },
  };
}

function instalar() {
  global.SpreadsheetApp = {
    getActive: () => ({
      getSheetByName: (n) => (estado.hojas[n] ? hoja(n) : null),
      insertSheet: (n) => hoja(n),
    }),
    getUi: () => ({
      createMenu: function () { return this; }, addItem: function () { return this; },
      addSeparator: function () { return this; }, addToUi: () => {},
      alert: (m) => estado.alertasUi.push(m),
      prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => estado.promptRespuesta || '' }),
      ButtonSet: { OK_CANCEL: 'OK_CANCEL' }, Button: { OK: 'OK', CANCEL: 'CANCEL' },
    }),
    newDataValidation: () => ({ requireValueInList: function () { return this; }, setAllowInvalid: function () { return this; }, build: () => ({}) }),
  };
  global.GmailApp = {
    sendEmail: (to, subject, body, opts) => {
      if (estado.forzarError) { const e = estado.forzarError; if (typeof e === 'function') e(to); }
      estado.correosEnviados.push({ to, subject, body, opts });
    },
    search: (q, start = 0, max = 50) => {
      const esRebote = /mailer-daemon/.test(q) && !/-from:\(mailer-daemon/.test(q.replace(/\s+/g, ' '));
      let lista = estado.hilos.filter(t => (esRebote ? t.rebote : !t.rebote));
      return lista.slice(start, start + max).map(t => ({
        getId: () => t.id,
        markImportant: () => { t.importante = true; },
        getMessages: () => t.mensajes.map(m => ({
          getFrom: () => m.from,
          getPlainBody: () => m.cuerpo,
          star: () => { m.starred = true; },
        })),
      }));
    },
  };
  global.MailApp = { getRemainingDailyQuota: () => estado.cuotaGmail };
  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (k in estado.props ? estado.props[k] : null),
      setProperty: (k, v) => { estado.props[k] = String(v); },
      deleteProperty: (k) => { delete estado.props[k]; },
    }),
  };
  global.Session = { getEffectiveUser: () => ({ getEmail: () => 'ventas.prueba@gmail.com' }) };
  global.HtmlService = {
    createHtmlOutputFromFile: (nombre) => {
      const salida = { archivo: nombre, titulo: null, metas: [] };
      salida.setTitle = (t) => { salida.titulo = t; return salida; };
      salida.addMetaTag = (k, v) => { salida.metas.push([k, v]); return salida; };
      return salida;
    },
  };
  global.ScriptApp = {
    newTrigger: (fn) => {
      const t = { fn };
      const b = { timeBased: () => b, atHour: (h) => { t.hora = h; return b; }, everyDays: () => b,
                  everyMinutes: (m) => { t.cadaMin = m; return b; }, everyHours: (h) => { t.cadaHora = h; return b; },
                  onWeekDay: () => b, inTimezone: () => b, create: () => { estado.triggers.push(t); return t; } };
      return b;
    },
    getProjectTriggers: () => [...estado.triggers],
    deleteTrigger: (t) => { estado.triggers = estado.triggers.filter(x => x !== t); },
    WeekDay: { MONDAY: 'MONDAY' },
  };
  global.Utilities = {
    sleep: () => {},
    formatDate: (d, tz, fmt) => {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
      return fmt.replace('dd', p.day).replace('MM', p.month).replace('yyyy', p.year)
        .replace('HH', p.hour).replace(/\bH\b/, String(Number(p.hour))).replace('mm', p.minute);
    },
  };
  // Reloj controlable: el motor usa new Date() y Date.now()
  const DateReal = Date;
  global.Date = class extends DateReal {
    constructor(...args) { if (args.length === 0) { super(estado.ahora.getTime()); } else { super(...args); } }
    static now() { return estado.ahora.getTime(); }
  };
  global.__DateReal = DateReal;
}

function cargarMotor() {
  const codigo = fs.readFileSync(MOTOR, 'utf8');
  (0, eval)(codigo);
}

module.exports = { estado, instalar, cargarMotor, hoja };

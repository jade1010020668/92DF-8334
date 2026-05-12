const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const PUERTO = process.env.PUERTO || 3000;
const LOG_FILE = path.join(__dirname, 'log.txt');

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(nivel, mensaje) {
  const linea = `${new Date().toISOString()} [${nivel}] ${mensaje}`;
  console.log(linea);
  fs.appendFileSync(LOG_FILE, linea + '\n');
}

// ─── Cliente WhatsApp ─────────────────────────────────────────────────────────
let clienteListoPromesa;
let clienteListo = false;

const cliente = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  }
});

cliente.on('qr', (qr) => {
  log('INFO', 'Escanea el codigo QR con el WhatsApp del papa:');
  qrcode.generate(qr, { small: true });
});

cliente.on('ready', () => {
  clienteListo = true;
  log('INFO', 'WhatsApp conectado y listo para enviar mensajes.');
});

cliente.on('disconnected', (razon) => {
  clienteListo = false;
  log('WARN', `WhatsApp desconectado: ${razon}. Reconectando...`);
  cliente.initialize().catch((err) => log('ERROR', `Error al reconectar: ${err.message}`));
});

cliente.on('auth_failure', (msg) => {
  clienteListo = false;
  log('ERROR', `Fallo de autenticacion: ${msg}. Borra .wwebjs_auth/ y vuelve a escanear el QR.`);
});

clienteListoPromesa = new Promise((resolve) => {
  cliente.once('ready', resolve);
});

cliente.initialize().catch((err) => {
  log('ERROR', `Error al inicializar cliente WhatsApp: ${err.message}`);
});

// ─── Express API ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// GET /estado → { conectado: bool }
app.get('/estado', (_req, res) => {
  res.json({ conectado: clienteListo });
});

// POST /enviar body: { numero: "+57XXXXXXXXXX", mensaje: "texto" }
app.post('/enviar', async (req, res) => {
  const { numero, mensaje } = req.body || {};

  if (!numero || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos: numero y mensaje' });
  }

  if (!clienteListo) {
    log('WARN', `Intento de envio a ${numero} pero WhatsApp no esta listo.`);
    return res.status(503).json({ ok: false, error: 'WhatsApp no esta conectado todavia.' });
  }

  // Normalizar numero: quitar +, agregar @c.us
  const chatId = numero.replace(/\D/g, '') + '@c.us';

  try {
    await cliente.sendMessage(chatId, mensaje);
    log('INFO', `Mensaje enviado a ${numero}`);
    res.json({ ok: true });
  } catch (err) {
    log('ERROR', `Error enviando a ${numero}: ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PUERTO, () => {
  log('INFO', `Servicio HTTP escuchando en puerto ${PUERTO}`);
  log('INFO', 'Esperando que WhatsApp se conecte...');
});

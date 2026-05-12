# Servicio WhatsApp — Dotacion Papa

Servicio Node.js que recibe mensajes de Apps Script y los envia por WhatsApp al papa.

---

## Requisitos

- Node.js 18 o superior
- PC o servidor que se quede prendido (puede ser el PC de Diego)

## Primera vez

```bash
cd whatsapp_service
npm install
node index.js
```

Al arrancar por primera vez aparece un **codigo QR en la terminal**. Escanea ese codigo con el WhatsApp del papa:

1. Abre WhatsApp en el celular del papa.
2. Toca los tres puntos arriba a la derecha → "Dispositivos vinculados".
3. Toca "Vincular un dispositivo".
4. Apunta la camara al QR de la terminal.

Una vez escaneado, el servicio dice `WhatsApp conectado y listo`. La sesion queda guardada en `.wwebjs_auth/` y no necesitas escanear de nuevo.

## Veces siguientes

```bash
cd whatsapp_service
node index.js
```

Arranca solo, sin pedir QR.

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/estado` | Devuelve `{ "conectado": true/false }` |
| `POST` | `/enviar` | Envia un mensaje. Body: `{ "numero": "+57XXXXXXXXXX", "mensaje": "texto" }` |

## Variables de entorno opcionales

| Variable | Defecto | Descripcion |
|---|---|---|
| `PUERTO` | `3000` | Puerto donde escucha el servicio |

## Logs

Los logs se guardan en `log.txt` (gitignoreado).

## Problemas comunes

**El QR expiro antes de escanearlo**
→ Detener el servicio (`Ctrl+C`), volver a correr `node index.js`.

**"Fallo de autenticacion"**
→ Borrar la carpeta `.wwebjs_auth/` y volver a escanear el QR.

**WhatsApp actualizo y dejo de funcionar**
→ Correr `npm update whatsapp-web.js` y reiniciar.

**El papa no recibe mensajes**
→ Verificar que el numero en Apps Script este en formato `+57XXXXXXXXXX`.
→ Revisar `log.txt` para ver el error exacto.
→ Llamar `GET /estado` para confirmar que el servicio esta conectado.

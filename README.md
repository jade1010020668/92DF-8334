# Dotacion Papa

Sistema de prospeccion B2B y envio de cotizaciones automatizado para una PYME de dotacion en Bogota.

> Este README es para **Diego** (operador tecnico).
> El papa tiene un manual aparte (`MANUAL_PAPA.pdf`) con capturas y lenguaje sencillo.

---

## Que hace

1. Busca empresas reales de un sector en Google Maps Bogota.
2. Visita sus paginas web y extrae el correo de contacto con IA (Gemini).
3. Envia cotizaciones personalizadas por Gmail.
4. Lee respuestas por IMAP y clasifica el interes con IA.
5. Notifica al WhatsApp del papa cuando alguien responde interesado.

Todo desde un acceso directo en el escritorio. El papa nunca ve la terminal.

---

## Estado actual

| Hito | Descripcion | Estado |
|---|---|---|
| 0 | Estructura del repo, logger, configuracion | en curso |
| 1 | Capa de datos (SQLite + CRUD) | pendiente |
| 2 | Cliente Gemini hibrido Pro/Flash | pendiente |
| 3 | Scraper Google Maps con Playwright | pendiente |
| 4 | Enriquecimiento web | pendiente |
| 5 | Envio SMTP + lectura IMAP | pendiente |
| 6 | Servicio WhatsApp (Node) | pendiente |
| 7 | Cliente WhatsApp (Python) | pendiente |
| 8 | Scheduler automatico | pendiente |
| 9 | UI Streamlit (4 pantallas) | pendiente |
| 10 | Empaquetado Windows (.bat + acceso directo) | pendiente |
| 11 | Manual del papa (PDF) | pendiente |

---

## Setup inicial (lo hace Diego una sola vez en el PC del papa)

### Requisitos

- Python 3.11 o superior.
- Node.js 18 o superior (para el servicio de WhatsApp).
- Conexion estable a internet.
- Windows 10/11 (objetivo de produccion). En Linux/Mac funciona para desarrollo pero los scripts `.bat` no.

### Pasos

1. Clonar el repo:
   ```bash
   git clone <url-del-repo>
   cd 92DF-8334
   ```

2. Crear entorno virtual de Python:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```

3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

4. Copiar `.env.ejemplo` a `.env` y llenar los valores:
   - `GEMINI_API_KEY`: obtenida en https://aistudio.google.com/apikey
   - `GMAIL_USUARIO`: correo Gmail del papa
   - `GMAIL_APP_PASSWORD`: generada en https://myaccount.google.com/apppasswords (requiere 2FA activado)
   - `WHATSAPP_NUMERO_PAPA`: numero con codigo de pais, ej. `+573001234567`
   - `CONFIG_PIN`: PIN de 4 digitos para entrar a la pantalla de configuracion

5. Llenar `config/configuracion.yaml` con los productos reales de la empresa y el primer sector objetivo.

6. (Cuando este implementado el servicio Node)
   ```bash
   cd whatsapp_service
   npm install
   ```

### Probar instalacion

```bash
pytest tests/
```

Debe pasar todos los tests sin errores.

---

## Como arrancar (futuro)

Cuando esten implementados los hitos 9 y 10, el papa solo hara doble clic al acceso directo `Dotacion Papa` en el escritorio. Eso arrancara:

1. El servicio Node de WhatsApp en `localhost:3000`.
2. La app Streamlit en `localhost:8501`.
3. El navegador apuntando a la app.

Para detener todo: doble clic en `detener.bat`.

---

## Seguridad

- **Nunca** subir el archivo `.env` a git. El `.gitignore` ya lo bloquea, pero verificar antes de cada commit.
- **Nunca** compartir la `GEMINI_API_KEY` por chat, captura o repositorio publico. Si se filtra, rotarla **inmediatamente** en https://aistudio.google.com/apikey.
- La contrasena de Gmail va como App Password, no como contrasena normal.
- La sesion de WhatsApp se guarda en `whatsapp_service/.wwebjs_auth/`. Ese directorio nunca se sube a git ni se comparte.

Antes de cualquier commit, ejecutar:
```bash
grep -rE "AIza|password|secret" --exclude-dir=venv --exclude-dir=.git .
```
para detectar secretos olvidados.

---

## Creditos Gemini

El proyecto tiene aproximadamente **$1.000.000 COP (~$250 USD)** en creditos prepago de Gemini, validos por 2 meses. El dashboard muestra el saldo estimado restante.

Cuando se agoten:
1. Abrir `config/configuracion.yaml`.
2. Cambiar `apis.forzar_flash` a `true`.
3. Reiniciar la app.

El sistema sigue operando con el tier gratuito de `gemini-2.5-flash`, con calidad menor pero suficiente.

---

## Estructura del proyecto

```
.
├── .env                      # SECRETOS, no se sube
├── .env.ejemplo              # plantilla publica
├── .gitignore
├── README.md                 # este archivo (para Diego)
├── MANUAL_PAPA.pdf           # para el papa, generado en hito 11
├── iniciar.bat               # arranque por doble clic (hito 10)
├── detener.bat
├── requirements.txt
├── config/
│   └── configuracion.yaml
├── src/
│   ├── app_streamlit.py      # entrada UI
│   ├── paginas/              # 4 pantallas Streamlit
│   ├── servicios/            # scraper, ia, correos, whatsapp, scheduler
│   ├── modelos/              # dataclasses tipadas
│   └── utilidades/           # db, logger, plantillas
├── plantillas/               # plantillas de cotizacion en texto
├── whatsapp_service/         # servicio Node con whatsapp-web.js
├── db/                       # SQLite local, no se sube
├── logs/                     # rotacion diaria, no se sube
└── tests/                    # pytest
```

---

## Soporte

Si algo falla en produccion: revisar `logs/sistema.log` (las ultimas 50 lineas las muestra la pantalla de Configuracion). Si el problema persiste, abrir issue en el repo.

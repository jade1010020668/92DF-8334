#!/usr/bin/env python3
"""
Cañón de correos diario — DotaciónPro
=====================================
Corre solo en la nube (GitHub Actions, días hábiles). Cada día:

  1. Toma los siguientes 50 destinatarios de la base (datos/BASE_GENERAL_v2.json),
     priorizando empresas que compran dotación (prioridad 1) y saltando
     los ya contactados y las bajas.
  2. Envía por Brevo un correo personalizado (3 plantillas que rotan,
     gancho del 31 de agosto hasta esa fecha, enlace de baja automático).
  3. Registra lo enviado en datos/estado_envios.json (queda en el repo:
     nunca se repite un destinatario).
  4. Recoge las métricas de Brevo (aperturas, clics, rebotes) y las guarda
     en datos/reporte_envios.json.

Modo prueba: `python robot/enviar_correos.py --simular` no envía nada,
solo muestra qué haría. Sin BREVO_API_KEY el robot sale sin error (queda
"apagado" hasta que Diego ponga el secreto en GitHub).
"""
import json, os, re, ssl, sys, urllib.request
from datetime import date, datetime, timezone

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(RAIZ, "datos", "BASE_GENERAL_v2.json")
ESTADO = os.path.join(RAIZ, "datos", "estado_envios.json")
REPORTE = os.path.join(RAIZ, "datos", "reporte_envios.json")
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()

LOTE_DIARIO = 50
CATALOGO = "https://morales101002-dotacionpro.static.hf.space/catalogo.html"
REMITENTE_NOMBRE = "Dotaciones El Manantial S.A.S"

def log(m): print(f"[correos] {m}", flush=True)

def gancho_sector(sector):
    s = (sector or "").lower()
    if "taller" in s or "llanta" in s or "repuesto" in s: return "overoles, guantes y botas de seguridad para su equipo"
    if "ferreter" in s or "construc" in s or "pintur" in s: return "dotación y elementos de protección para su personal"
    if "restaur" in s or "panader" in s or "cafeter" in s or "comida" in s or "carnicer" in s: return "uniformes, delantales y dotación para su personal"
    if "clínica" in s or "clinica" in s or "salud" in s or "drogu" in s or "hospital" in s or "ips" in s.lower(): return "uniformes antifluido y dotación para su personal"
    return "la dotación y los elementos de protección de su personal"

def hay_gancho_agosto():
    hoy = date.today()
    return (hoy.month == 7) or (hoy.month == 8 and hoy.day <= 31)

def plantilla(i, empresa, sector):
    g = gancho_sector(sector)
    agosto = hay_gancho_agosto()
    encabezado = (
        "Se acerca la entrega de dotación de ley del <b>31 de agosto</b>."
        if agosto else
        "Sabemos lo importante que es tener a su equipo bien dotado todo el año."
    )
    asuntos = [
        f"Dotación del 31 de agosto — cotización a tiempo" if agosto else "Cotización de dotación para su empresa",
        f"¿Ya tiene lista la dotación de su personal?",
        f"Dotación y EPP a precio de fábrica — Bogotá",
    ]
    cuerpo = f"""
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2b2620;line-height:1.6;max-width:560px">
<p>Señores <b>{empresa}</b>:</p>
<p>{encabezado} En <b>Dotaciones El Manantial S.A.S</b> (Bogotá, NIT 830.137.919-3)
confeccionamos {g} a precios de fábrica, con descuentos desde 20 unidades y
bordado de su logo.</p>
<p style="margin:22px 0">
<a href="{CATALOGO}" style="background:#141210;color:#d9bd7e;padding:13px 22px;border-radius:6px;
text-decoration:none;font-weight:bold">📖 Ver catálogo con precios</a></p>
<p>Respondemos la cotización <b>el mismo día</b>, sin compromiso.</p>
<p>Cordial saludo,<br><b>José Manuel Morales Quintana</b><br>
Dotaciones El Manantial S.A.S · Carrera 34 No. 2-62, Bogotá<br>
Tel. (601) 721 3566 · Cel. y WhatsApp 313 574 5063</p>
<hr style="border:none;border-top:1px solid #e7ddc9;margin:18px 0">
<p style="font-size:12px;color:#8a8072">Recibió este mensaje porque su empresa aparece en
directorios públicos de Bogotá. Si no desea recibir información, responda BAJA o use este
enlace: <a href="{{{{ unsubscribe }}}}" style="color:#8a8072">darme de baja</a>.</p>
</div>"""
    return asuntos[i % 3], cuerpo

def cargar(ruta, defecto):
    try:
        return json.load(open(ruta))
    except Exception:
        return defecto

def api_brevo(ruta, metodo="GET", cuerpo=None, key=None):
    req = urllib.request.Request(
        "https://api.brevo.com/v3" + ruta, method=metodo,
        headers={"api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
        data=json.dumps(cuerpo).encode() if cuerpo else None)
    with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
        return json.loads(r.read().decode() or "{}")

def main():
    simular = "--simular" in sys.argv
    key = os.environ.get("BREVO_API_KEY", "").strip()
    remitente = os.environ.get("BREVO_REMITENTE", "dot.manantial@hotmail.com").strip()
    if not key and not simular:
        log("Sin BREVO_API_KEY: el cañón está apagado (agrega el secreto en GitHub para encenderlo).")
        return 0

    base = cargar(BASE, [])
    estado = cargar(ESTADO, {"enviados": {}, "bajas": []})
    enviados = estado["enviados"]

    # candidatos: correo válido, no enviado antes, no baja; prioridad 1 primero
    RE_MAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$")
    cand = []
    for e in base:
        em = (e.get("email") or "").lower().strip()
        if not em or not RE_MAIL.match(em): continue
        if em in enviados or em in estado["bajas"]: continue
        if re.search(r"@.*(gov|policia|mindefensa|fiscalia)\.", em): continue
        # basura técnica: rastreadores, no-reply, hex largos, dominios de prueba
        if re.search(r"sentry|wixpress|no-?reply|noreply|mailer-daemon|example\.|@.*\.(png|jpg)$", em): continue
        if re.match(r"^[0-9a-f]{20,}@", em): continue
        cand.append(e)
    cand.sort(key=lambda e: e.get("prioridad", 2))
    lote = cand[:LOTE_DIARIO]
    log(f"Base: {len(base)} | candidatos pendientes: {len(cand)} | lote de hoy: {len(lote)}")

    ok = fallo = 0
    for i, e in enumerate(lote):
        asunto, html = plantilla(i, e["nombre"], e.get("sector"))
        if simular:
            log(f"  SIMULO → {e['email']} :: {asunto}")
            ok += 1
            continue
        try:
            api_brevo("/smtp/email", "POST", {
                "sender": {"email": remitente, "name": REMITENTE_NOMBRE},
                "to": [{"email": e["email"], "name": e["nombre"][:60]}],
                "subject": asunto,
                "htmlContent": html,
                "tags": ["campana-dotacion"],
            }, key)
            enviados[e["email"]] = {"fecha": date.today().isoformat(), "empresa": e["nombre"][:60]}
            ok += 1
        except Exception as ex:
            fallo += 1
            log(f"  fallo {e['email']}: {str(ex)[:80]}")

    if not simular:
        estado["ultima_corrida"] = datetime.now(timezone.utc).isoformat()
        json.dump(estado, open(ESTADO, "w"), ensure_ascii=False, indent=1)
        # métricas agregadas de Brevo (aperturas, clics, rebotes)
        try:
            rep = api_brevo("/smtp/statistics/aggregatedReport?days=30", key=key)
            rep["actualizado"] = datetime.now(timezone.utc).isoformat()
            rep["total_contactados"] = len(enviados)
            json.dump(rep, open(REPORTE, "w"), ensure_ascii=False, indent=1)
            log(f"Métricas 30 días: enviados={rep.get('requests')} abiertos={rep.get('uniqueOpens')} clics={rep.get('uniqueClicks')}")
        except Exception as ex:
            log(f"métricas no disponibles: {str(ex)[:80]}")

    log(f"Listo: {ok} enviados, {fallo} fallos. Total histórico: {len(enviados)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())

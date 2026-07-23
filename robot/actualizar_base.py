#!/usr/bin/env python3
"""
Robot de la base de datos — DotaciónPro
=======================================
Corre solo en la nube (GitHub Actions) según un horario. No necesita ningún
computador prendido. Su trabajo, de principio a fin:

  1. RECOGE   empresas nuevas de OpenStreetMap (talleres, ferreterías, fábricas,
              restaurantes... = negocios pequeños que compran dotación) y de los
              datos abiertos oficiales (datos.gov.co).
  2. ENRIQUECE visitando la página web de cada empresa para sacar correo/teléfono.
  3. LIMPIA   traduce sectores al español, valida correos, quita repetidos y
              descarta lo que no sirve.
  4. CLASIFICA cada empresa: sector, actividad, si compra dotación y tamaño.
  5. ESCRIBE  el archivo final web/empresas-bogota.json (lo que usa la app).

El despliegue al Space y el commit los hace el flujo de GitHub Actions.
"""
import json, os, re, ssl, sys, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Rutas ---
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "web", "empresas-bogota.json")
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()

def log(msg): print(f"[robot] {msg}", flush=True)

# ==========================================================================
# 1) OpenStreetMap — negocios que compran dotación, por tipo
# ==========================================================================
OVERPASS = ["https://overpass.kumi.systems/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.osm.ch/api/interpreter",
            "https://overpass-api.de/api/interpreter"]

# tipo OSM -> (sector español, prioridad 1=alta 2=media, tamaño estimado)
MAPA_OSM = {
  "shop=car_repair":("Taller de carros",1,"Micro/Pequeña"),
  "shop=motorcycle_repair":("Taller de motos",1,"Micro/Pequeña"),
  "shop=car_parts":("Repuestos de carros",2,"Pequeña"),
  "shop=tyres":("Llantas",1,"Micro/Pequeña"),
  "shop=hardware":("Ferretería",1,"Micro/Pequeña"),
  "shop=doityourself":("Ferretería/Bricolaje",1,"Pequeña"),
  "shop=paint":("Pinturas",1,"Micro/Pequeña"),
  "shop=trade":("Materiales de construcción",1,"Pequeña"),
  "shop=bakery":("Panadería",1,"Micro/Pequeña"),
  "shop=butcher":("Carnicería",1,"Micro"),
  "shop=greengrocer":("Fruver",2,"Micro"),
  "shop=laundry":("Lavandería",1,"Micro/Pequeña"),
  "shop=dry_cleaning":("Lavandería en seco",1,"Micro"),
  "shop=fabric":("Telas",2,"Micro/Pequeña"),
  "shop=shoes":("Calzado",2,"Micro"),
  "amenity=restaurant":("Restaurante",1,"Pequeña"),
  "amenity=fast_food":("Comida rápida",1,"Micro/Pequeña"),
  "amenity=cafe":("Cafetería",2,"Micro"),
  "amenity=hospital":("Hospital",1,"Grande"),
  "amenity=clinic":("Clínica",1,"Mediana"),
  "amenity=pharmacy":("Droguería",2,"Micro/Pequeña"),
  "amenity=fuel":("Estación de servicio",1,"Pequeña"),
  "office=company":("Empresa/Oficina",2,"Pequeña/Mediana"),
  "man_made=works":("Fábrica/Industria",1,"Mediana"),
}
CRAFT = {"carpenter":"Carpintería","metal_construction":"Metalmecánica","electrician":"Electricista",
  "plumber":"Plomería","painter":"Pintura/Obra","shoemaker":"Zapatería","tailor":"Sastrería",
  "dressmaker":"Modistería","welder":"Soldadura","blacksmith":"Herrería","locksmith":"Cerrajería",
  "upholsterer":"Tapicería","glaziery":"Vidriería","stonemason":"Marmolería"}

def overpass(query):
    for url in OVERPASS:
        try:
            body = ("data=" + urllib.parse.quote(query)).encode()
            req = urllib.request.Request(url, data=body, headers={"User-Agent": "DotacionProBot/1.0"})
            return json.loads(urllib.request.urlopen(req, timeout=90, context=CTX).read())
        except Exception:
            time.sleep(2)
    return None

def clasifica_osm(t):
    for k, v in MAPA_OSM.items():
        tag, val = k.split("=")
        if t.get(tag) == val:
            return v
    if t.get("craft"):
        return CRAFT.get(t["craft"], f"Taller/Oficio ({t['craft']})"), 1, "Micro/Pequeña"
    if t.get("industrial"):
        return "Fábrica/Industria", 1, "Mediana"
    if t.get("office") == "company":
        return "Empresa/Oficina", 2, "Pequeña/Mediana"
    return None

def recoger_osm():
    """Recorre una grilla sobre Bogotá + Cundinamarca cercana."""
    lat0, lat1, lon0, lon1, step = 4.44, 4.82, -74.24, -74.00, 0.06
    celdas, lat = [], lat0
    while lat < lat1:
        lon = lon0
        while lon < lon1:
            celdas.append((round(lat, 3), round(lat + step, 3), round(lon, 3), round(lon + step, 3)))
            lon += step
        lat += step
    vistos = {}
    for i, (s, n, w, e) in enumerate(celdas):
        partes = []
        for k in MAPA_OSM:
            tag, val = k.split("=")
            partes.append(f'node["{tag}"="{val}"]({s},{w},{n},{e});')
            partes.append(f'way["{tag}"="{val}"]({s},{w},{n},{e});')
        partes.append(f'node["craft"]({s},{w},{n},{e});way["craft"]({s},{w},{n},{e});')
        partes.append(f'node["industrial"]({s},{w},{n},{e});')
        q = f'[out:json][timeout:60];({"".join(partes)});out center 900;'
        data = overpass(q)
        if not data:
            log(f"OSM celda {i+1}/{len(celdas)} sin respuesta"); continue
        for el in data.get("elements", []):
            t = el.get("tags", {}); nombre = t.get("name")
            if not nombre or len(nombre) < 3: continue
            cl = clasifica_osm(t)
            if not cl: continue
            clave = nombre.lower().strip()
            if clave in vistos: continue
            sec, pri, tam = cl
            vistos[clave] = {
                "nombre": nombre[:100], "sector": sec, "actividad": sec, "prioridad": pri, "tamano": tam,
                "email": (t.get("email") or t.get("contact:email") or "").strip(),
                "telefono": (t.get("phone") or t.get("contact:phone") or t.get("contact:mobile") or "").strip(),
                "direccion": " ".join(x for x in [t.get("addr:street", ""), t.get("addr:housenumber", "")] if x).strip(),
                "website": (t.get("website") or t.get("contact:website") or t.get("url") or "").strip(),
                "lat": el.get("lat") or (el.get("center") or {}).get("lat"),
                "lon": el.get("lon") or (el.get("center") or {}).get("lon"),
                "fuente": "OpenStreetMap",
            }
        if (i + 1) % 7 == 0: log(f"OSM {i+1}/{len(celdas)} celdas · {len(vistos)} empresas")
    log(f"OSM terminado: {len(vistos)} empresas")
    return list(vistos.values())

# ==========================================================================
# 2) datos.gov.co — empresas oficiales de Bogotá con contacto
# ==========================================================================
RE_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
RE_BOGOTA = re.compile(r"bogot|cundinamar|soacha|mosquera|funza|madrid|cota|ch[ií]a|cajic|zipaquir|11001|^25", re.I)
TERMINOS_GOV = ["empresas correo electronico bogota", "directorio empresas bogota",
                "comerciantes bogota correo", "prestadores servicios bogota correo"]

def jget(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DotacionProBot/1.0"})
        return json.loads(urllib.request.urlopen(req, timeout=60, context=CTX).read())
    except Exception:
        return None

def recoger_datos_gov(limite_datasets=25):
    """Busca datasets con empresas+correo, baja los de Bogotá y saca las filas contactables."""
    datasets = {}
    for q in TERMINOS_GOV:
        d = jget("https://www.datos.gov.co/api/catalog/v1?domains=www.datos.gov.co&limit=40&q=" + urllib.parse.quote(q))
        if not d: continue
        for it in d.get("results", []):
            r = it.get("resource", {}); rid = r.get("id")
            cols = " ".join(c or "" for c in (r.get("columns_name") or [])).lower()
            if rid and rid not in datasets and ("correo" in cols or "email" in cols):
                datasets[rid] = r.get("name", "")
    log(f"datos.gov.co: {len(datasets)} datasets candidatos")
    filas = []
    for rid in list(datasets)[:limite_datasets]:
        data = jget(f"https://www.datos.gov.co/resource/{rid}.json?$limit=15000")
        if not isinstance(data, list) or not data: continue
        claves = list(data[0].keys())
        c_email = next((c for c in claves if re.search(r"correo|email", c, re.I)), None)
        c_nom = next((c for c in claves if re.search(r"razon|nombre|empresa|establec", c, re.I)), None)
        c_tel = next((c for c in claves if re.search(r"tel|celular|movil", c, re.I)), None)
        c_dir = next((c for c in claves if re.search(r"direcc|dir.?com", c, re.I)), None)
        c_mun = next((c for c in claves if re.search(r"municip|ciudad", c, re.I)), None)
        c_act = next((c for c in claves if re.search(r"ciiu|actividad", c, re.I)), None)
        if not c_email or not c_nom: continue
        for f in data:
            zona = str(f.get(c_mun, "") or "") + " " + str(f.get(c_dir, "") or "")
            if c_mun and not RE_BOGOTA.search(zona): continue
            m = RE_EMAIL.search(str(f.get(c_email) or ""))
            if not m: continue
            nombre = str(f.get(c_nom) or "").strip()
            if len(nombre) < 4: continue
            filas.append({
                "nombre": nombre[:100], "email": m.group(0).lower(),
                "telefono": re.sub(r"[^\d+]", "", str(f.get(c_tel, "") or ""))[:20] if c_tel else "",
                "direccion": str(f.get(c_dir, "") or "").strip()[:100] if c_dir else "",
                "actividad": str(f.get(c_act, "") or "").strip()[:60] if c_act else "",
                "sector": "", "prioridad": 2, "tamano": "", "website": "",
                "lat": None, "lon": None, "fuente": "datos.gov.co",
            })
    log(f"datos.gov.co terminado: {len(filas)} filas de Bogotá con correo")
    return filas

# ==========================================================================
# 3) Enriquecer: visitar la web y sacar correo/teléfono
# ==========================================================================
RE_TEL_CO = re.compile(r"(?:\+?57[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?[3][\d\s-]{8,11}")

def scrap_web(empresa):
    url = empresa.get("website")
    if not url: return empresa
    if not url.startswith("http"): url = "https://" + url
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=12, context=CTX).read().decode("utf-8", "replace")
        html = html.replace("%40", "@")
        if not empresa["email"]:
            m = RE_EMAIL.search(html)
            if m and not re.search(r"\.(png|jpg|gif|svg)$", m.group(0), re.I):
                empresa["email"] = m.group(0).lower()
        if not empresa["telefono"]:
            m = RE_TEL_CO.search(html)
            if m: empresa["telefono"] = re.sub(r"[^\d+]", "", m.group(0))[:20]
    except Exception:
        pass
    return empresa

def enriquecer(empresas, cap=400):
    conweb = [e for e in empresas if e.get("website") and not (e.get("email") and e.get("telefono"))][:cap]
    log(f"Enriqueciendo {len(conweb)} empresas con página web…")
    ganados = 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        for fut in as_completed([ex.submit(scrap_web, e) for e in conweb]):
            r = fut.result()
            if r.get("email") or r.get("telefono"): ganados += 1
    log(f"Enriquecimiento: {ganados} empresas recibieron correo/teléfono")
    return empresas

# ==========================================================================
# 4) Limpiar / clasificar / fusionar
# ==========================================================================
TRAD = {"restaurant":"Restaurante","school":"Colegio","company":"Empresa","hardware":"Ferretería",
  "clothes":"Ropa","car_parts":"Repuestos de carros","pharmacy":"Farmacia","chemist":"Droguería",
  "university":"Universidad","supermarket":"Supermercado","bakery":"Panadería","clinic":"Clínica",
  "shoes":"Calzado","cafe":"Cafetería","car_repair":"Taller de carros","electronics":"Electrónica",
  "sports":"Artículos deportivos","beauty":"Belleza","hospital":"Hospital","furniture":"Muebles"}

def traducir(s):
    if not s: return s
    k = s.strip().lower()
    return TRAD.get(k, s[:1].upper() + s[1:].replace("_", " "))

def clave(txt):
    txt = unicodedata.normalize("NFD", (txt or "").lower())
    return re.sub(r"[^a-z0-9]", "", txt)

def mail_ok(m):
    m = (m or "").lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", m): return False
    if re.search(r"@(ejemplo|example|test|noexiste)", m): return False
    return True

def tel_ok(t):
    d = re.sub(r"\D", "", t or "")
    return len(d) >= 7 and not re.match(r"^(0+|1234|1111|0000)", d)

def fusionar(*grupos):
    por_nombre, orden = {}, []
    for grupo in grupos:
        for e in grupo:
            k = clave(e["nombre"])
            if not k: continue
            if k not in por_nombre:
                por_nombre[k] = e; orden.append(k)
            else:  # completar datos faltantes sin pisar
                cur = por_nombre[k]
                for campo in ("email", "telefono", "direccion", "website", "actividad", "sector"):
                    if not cur.get(campo) and e.get(campo): cur[campo] = e[campo]
                if cur.get("lat") is None and e.get("lat") is not None:
                    cur["lat"], cur["lon"] = e["lat"], e["lon"]
                cur["prioridad"] = min(cur.get("prioridad", 2), e.get("prioridad", 2))
    return [por_nombre[k] for k in orden]

def normalizar(e):
    e["sector"] = traducir(e.get("sector") or e.get("actividad") or "")
    if not e.get("actividad"): e["actividad"] = e["sector"]
    e["email"] = (e.get("email") or "").strip()
    e["telefono"] = (e.get("telefono") or "").strip()
    if e["email"] and not mail_ok(e["email"]): e["email"] = ""
    if e["telefono"] and not tel_ok(e["telefono"]): e["telefono"] = ""
    return e

# ==========================================================================
# Programa principal
# ==========================================================================
def main():
    t0 = time.time()
    solo_rapido = "--rapido" in sys.argv  # para pruebas: salta la cosecha larga
    osm = [] if solo_rapido else recoger_osm()
    gov = recoger_datos_gov()
    todas = fusionar(osm, gov)
    todas = enriquecer(todas)
    todas = [normalizar(e) for e in todas]

    # Marcar cuáles están 100% completas (correo + teléfono + dirección + sector)
    for e in todas:
        e["completa"] = bool(e["email"] and e["telefono"] and e["direccion"] and e["sector"])

    completas = [e for e in todas if e["completa"]]
    contactables = [e for e in todas if e["email"] or e["telefono"]]
    # Orden: completas primero, luego prioridad alta, luego el resto
    todas.sort(key=lambda e: (0 if e["completa"] else 1, e.get("prioridad", 2)))

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w") as f:
        json.dump(todas, f, ensure_ascii=False)

    log("=" * 55)
    log(f"BASE ACTUALIZADA: {len(todas)} empresas")
    log(f"  · 100% completas (correo+tel+dir+sector): {len(completas)}")
    log(f"  · contactables (correo o teléfono):       {len(contactables)}")
    log(f"  · compran dotación (prioridad alta):      {sum(1 for e in todas if e.get('prioridad')==1)}")
    log(f"  · archivo: {SALIDA} ({os.path.getsize(SALIDA)//1024} KB)")
    log(f"  · tiempo: {int(time.time()-t0)} s")
    log("=" * 55)

if __name__ == "__main__":
    main()

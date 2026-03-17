# Guía de instalación — DATALAB SUITE

## Requisitos previos
- Git instalado
- Cuenta GitHub: MobilDataLab
- Cuenta Vercel: Mobil_DataLab's projects (ya existe)

---

## Paso 1 — Publicar el repositorio en GitHub

```bash
# Desde la carpeta datalab-suite:
git init
git add .
git commit -m "feat: initial DATALAB SUITE setup"
git branch -M main

# Crear el repo en GitHub (MobilDataLab/datalab-suite) y luego:
git remote add origin https://github.com/MobilDataLab/datalab-suite.git
git push -u origin main
```

## Paso 2 — Conectar el portal a Vercel

1. Ir a https://vercel.com/mobil-datalabs-projects
2. Click "Add New Project"
3. Importar repositorio: `MobilDataLab/datalab-suite`
4. **Root Directory**: cambiar a `apps/index`
5. Framework Preset: Other (static)
6. Deploy

URL resultante: `datalab-suite.vercel.app` (o personalizar en Vercel)

## Paso 3 — Configurar Secrets para el workflow automático

En GitHub → Settings → Secrets → Actions, agregar:

| Secret | Valor |
|--------|-------|
| `VERCEL_TOKEN` | Token de API de Vercel (Settings → Tokens) |
| `VERCEL_TEAM_ID` | `team_OFhJUxXp0BBV61syfYd1wPcw` |
| `VERCEL_INDEX_PROJECT_ID` | ID del proyecto recién creado (ver .vercel/project.json) |

## Paso 4 — Verificar backup automático

Después del primer push a main, verificar en GitHub → Actions que:
- El job `Deploy` completó ✅
- El job `Backup Snapshot` creó una rama `backup/YYYY-MM-DD-...` ✅

## Paso 5 — Backup manual antes de cambios grandes

```bash
bash scripts/backup.sh "antes-de-rediseno-portal"
```

---

## Agregar una nueva herramienta

```bash
# 1. Crear carpeta en apps/
mkdir apps/nueva-tool
# ... agregar archivos de la herramienta

# 2. Registrar en docs/CHANGELOG.md

# 3. Agregar card en apps/index/index.html

# 4. Crear nuevo proyecto en Vercel apuntando a apps/nueva-tool

# 5. Commit y push → deploy automático
git add .
git commit -m "[nueva-tool] descripción del cambio"
git push
```

# DATALAB SUITE — Mobil Arquitectos

Repositorio central de herramientas digitales desarrolladas por INTERLAB / Datalab.

## Estructura
datalab-suite/
├── apps/
│   ├── index/          → Portal principal (lista de herramientas)
│   └── [nueva-tool]/   → Cada herramienta futura va aquí
├── shared/
│   ├── components/     → Componentes reutilizables entre tools
│   └── styles/         → Tokens de diseño Mobil Arquitectos
├── scripts/
│   └── backup.sh       → Script de backup a rama backup/
├── docs/
│   └── CHANGELOG.md    → Historial de cambios por herramienta
└── .github/
└── workflows/      → CI/CD: deploy + backup automático

## Herramientas activas

| Tool | URL | Estado |
|------|-----|--------|
| EETT Selector | mobil-eett.vercel.app | ✅ Producción |
| Portal DATALAB SUITE | datalab-suite.vercel.app | ✅ Producción |

## Sistema de backup y auditoría

- Cada merge a `main` genera un snapshot automático en la rama `backup/YYYY-MM-DD`
- El archivo `docs/CHANGELOG.md` registra cada cambio con autor, fecha y descripción

## Flujo de trabajo con IA

1. Solicitar mejora a Claude en el chat
2. Claude genera el código
3. Subir a GitHub → Vercel despliega automáticamente

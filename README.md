# PoV!

Esplora il mondo con Street View, fotocamera AR e analisi AI dei luoghi intorno a te.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express 5 + TypeScript + Node.js 24
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk
- **AI**: OpenAI (analisi scene + audio)
- **Maps**: Google Maps API (Street View, Places, Geocoding)
- **Mobile**: Capacitor (Android/iOS)
- **Package manager**: pnpm workspaces
- **Deploy**: Railway / Render + Docker

## Struttura monorepo

```
artifacts/
  api-server/       # Backend Express
  street-explorer/  # Frontend React + app mobile
lib/
  api-client-react/ # Client API con React Query
  api-spec/         # OpenAPI spec + codegen Orval
  api-zod/          # Schemi Zod generati
  db/               # Schema database Drizzle
  integrations-openai-ai-react/   # Hook audio AI client
  integrations-openai-ai-server/  # Client OpenAI server-side
scripts/            # Utility
```

## Setup

### Prerequisiti
- Node.js 24+
- pnpm 9+
- PostgreSQL

### Installazione

```bash
# Clona il repo
git clone <url>
cd PoV

# Copia e compila il file .env
cp .env.example .env
# → Compila le variabili in .env

# Installa le dipendenze
pnpm install

# Push dello schema DB (solo prima volta / dopo modifiche schema)
pnpm --filter @workspace/db run push

# Avvia il backend
pnpm --filter @workspace/api-server run dev

# Avvia il frontend (in un altro terminale)
cd artifacts/street-explorer
pnpm dev
```

## Build e Deploy

```bash
# Build completo
pnpm run build

# Avvia con Docker
docker build -t pov .
docker run -p 3000:3000 --env-file .env pov
```

## App Android

```bash
cd artifacts/street-explorer

# Build web
pnpm build

# Sincronizza con Capacitor
npx cap sync android

# Apri in Android Studio
npx cap open android
```

## Comandi utili

```bash
# Typecheck completo
pnpm run typecheck

# Rigenera API client da OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Variabili d'ambiente

Vedi `.env.example` per la lista completa delle variabili necessarie.

## Note per sviluppo locale

### Variabili d'ambiente con Vite
Il file `.env` va copiato in **due** posizioni:
- `/.env` (root, per il backend)
- `/artifacts/street-explorer/.env` (per il frontend Vite)

### Clerk in sviluppo locale
Crea una nuova applicazione su https://dashboard.clerk.com dedicata allo sviluppo locale. Le chiavi di produzione (Replit/Render) non funzionano su `localhost`.

### Windows
Su Windows PowerShell, abilitare gli script prima di usare pnpm:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Lo script `dev` dell'api-server usa `cross-env` per compatibilità Windows:
```json
"dev": "cross-env NODE_ENV=development pnpm run build && pnpm run start"
```

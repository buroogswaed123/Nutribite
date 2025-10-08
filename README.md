# Nutribite

A full‑stack nutrition and meal planning app with admin and customer experiences.

- Backend: Node.js/Express (directory: `BE/`)
- Frontend: React (directory: `FE/`)

## Features
- Public recipes listing with filters, macros, pricing, and ratings (`FE/src/components/pages/recipes/Recipes.jsx`).
- Recipe rating system: customers rate 0–5 stars; average is shown per recipe.
- Admin menu/price controls (per recipe product).
- FAQ system:
  - Customer FAQ (`FE/src/components/pages/customer/faq/FAQ.jsx`).
  - Admin FAQ management (`FE/src/components/pages/admin/faq/AdminFAQ.jsx`) with tabs, publish toggle, inline answer, and a "View reply" modal for editing answers.
- Plans, cart, and orders helpers via `FE/src/utils/functions.js`.

## Project Structure
```
Nutribite/
├─ BE/                       # Backend (Express server)
│  ├─ app.js                 # Server entry and route mounting
│  ├─ routes/                # API routes (admin, recipes, menu, questions, etc.)
│  ├─ middleware/            # Auth / role middlewares
│  ├─ database/              # DB access/helpers
│  └─ utils/                 # Server utilities
├─ FE/                       # Frontend (React)
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ pages/
│  │  │  │  ├─ recipes/Recipes.jsx
│  │  │  │  ├─ admin/faq/AdminFAQ.jsx
│  │  │  │  └─ customer/faq/FAQ.jsx
│  │  └─ utils/functions.js  # API helpers (recipes, ratings, menu, cart, plan, etc.)
│  ├─ package.json
│  └─ ...
├─ .gitignore
├─ README.md
└─ docs/
   └─ API.md
```

## Prerequisites
- Node.js 18+
- npm 8+
- A running database (see BE/.env.example)

## Environment Variables
Create these files and fill them with your values:
- `BE/.env` (copy from `BE/.env.example`)
- `FE/.env` (copy from `FE/.env.example`)

See examples below.

## Setup & Run (Development)
Open two terminals (one for BE, one for FE) at the repository root.

- Backend (Express):
```
cd BE
npm install
npm run dev   # or: npm start
```
By default the backend listens on `PORT` (e.g., 3000).

- Frontend (React):
```
cd FE
npm install
npm start
```
By default the frontend runs on http://localhost:3001 (adjust to your setup). The FE will call the BE using `REACT_APP_API_BASE_URL` or `VITE_API_BASE_URL`.

## Admin Authentication & Routing
- Admin auth endpoints are mounted separately under `/api/admin/auth` (no admin guard on `/login`).
- All other admin endpoints are mounted under `/api/admin` with `requireAuth` + `requireAdmin`.
- Admin logout destroys the session.
- Ensure `/api/admin/auth/session` reads session to restore `req.user`.

## Notable Frontend Pages
- `FE/src/components/pages/recipes/Recipes.jsx`
  - Filters (diet, category, macros, calories, price for admins), discount badge, top-rated sorting.
  - Product price lookup with normalization across endpoints.
  - Star rating fetch and submit.
- `FE/src/components/pages/customer/faq/FAQ.jsx`
  - Public FAQ, "My Questions" sidebar, submit question.
- `FE/src/components/pages/admin/faq/AdminFAQ.jsx`
  - Tabs: unanswered / answered / all.
  - Publish toggles, inline answer, and a "View reply" modal for editing answers.

## API Reference
See `docs/API.md` for a concise list of key API endpoints and payloads.

## Screenshots (optional)
Add screenshots/GIFs under `docs/` and link them here for quick reviewer context.

## Development Notes
- Keep `node_modules`, build outputs, and caches out of Git. The repo `.gitignore` is configured.
- If you see large-file push errors on GitHub, ensure you did not commit artifacts. See README history rewrite notes in PRs if ever needed.

## License
Internal/educational project. Replace with your chosen license if distributing.

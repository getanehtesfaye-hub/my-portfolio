# Portfolio Platform

CMS-driven 3D portfolio with an admin dashboard. See `docs/ARCHITECTURE.md`.

| Folder | What it is | Address |
|---|---|---|
| `server` | Express + PostgreSQL API | http://localhost:4000/api/health |
| `client` | Public portfolio site | http://localhost:5173 |
| `admin` | Admin dashboard | http://localhost:5174 |

## Setup (Windows)
1. **Database.** Use Supabase or a local PostgreSQL. In `server\.env` set `DATABASE_URL` (both options are shown in `server\.env.example`).
   Local option: install PostgreSQL, then `createdb -U postgres portfolio`.
2. **Server** (terminal 1):
   ```
   cd server
   npm install
   npm run migrate
   npm run seed
   npm run dev
   ```
3. **Client** (terminal 2): `cd client`, `npm install`, `npm run dev`
4. **Admin** (terminal 3): `cd admin`, `npm install`, `npm run dev`

`JWT_SECRET` and `SETUP_TOKEN` in `server\.env` are already generated. Change them for production.
`client\.env` and `admin\.env` only need `VITE_API_URL=http://localhost:4000/api`.

## Create the first admin
PowerShell (use the `SETUP_TOKEN` from `server\.env`):
```powershell
Invoke-RestMethod -Method Post http://localhost:4000/api/auth/setup -ContentType "application/json" -Body '{"email":"you@example.com","password":"a-long-password","setupToken":"YOUR_SETUP_TOKEN"}'
```
Works once. After that the endpoint returns 409. Then sign in at http://localhost:5174.

## Troubleshooting
- `Invalid environment` on start: a value in `server\.env` is missing or too short.
- `ENOTFOUND` / timeout to Supabase: your network blocks the database port (5432/6543). Use another network or a local PostgreSQL.
- Password errors: special characters in the DB password must be URL-encoded.

# Architecture

```
portfolio-platform/
  server/   Express + TypeScript API (this phase)
  client/   Public site: React + Vite + R3F        (Phase 6-8)
  admin/    Admin dashboard: React + Vite          (Phase 4-5)
  shared/   Shared types and zod schemas           (added with client)
```

## Core idea: the CMS drives everything
- **Settings** (theme, typography, animation, hero, about, seo, footer, chatbot, contact, site) live in `site_settings` as keyed JSON with a `draft` and a `published` copy. A new editable setting needs no migration: just a new key.
- **Content** with order, relations or queries (skills, services, projects, social links, navigation, FAQs, messages, media, analytics) lives in normalised tables.
- The public site only reads **published** data. The admin edits **drafts**, previews them, then publishes. Each publish saves a version you can restore.
- The frontend maps `theme` and `typography` JSON to CSS variables, so a colour or font change updates the whole site.

## Backend layers
routes (HTTP and zod validation) -> services (logic such as chatbot matching) -> repositories (`utils/crud.ts`, parameterised SQL) -> PostgreSQL. Middleware: auth, CSRF header guard, rate limits, validation, error handling. Generic CRUD is registered from one resource table in `content.routes.ts`, so adding a content type is one entry.

## API
Public: `GET /api/site`, `/hero`, `/about`, `/theme`, `/typography`, `/animation`, `/seo`, `/footer`, `/chatbot`, `/contact`, `/skills`, `/services`, `/projects`, `/social-links`, `/navigation`, `/faqs`; `POST /api/contact`, `POST /api/chatbot/query`.
Auth: `GET /api/auth/setup-status`, `POST /setup`, `/login`, `/logout`, `GET /me`.
Admin (cookie + `X-Requested-With: portfolio-admin`): `/api/admin/settings/:key` (GET, PUT draft, POST publish, reset, restore, GET versions); `/api/admin/{skills,services,projects,social-links,navigation,faqs,faq-categories,skill-categories}` (GET, POST, PUT /:id, DELETE /:id, PUT /reorder); `/api/admin/contact-messages` (GET, PATCH status, DELETE).

## Security
bcrypt (cost 12), JWT in an httpOnly SameSite cookie, one-time `SETUP_TOKEN` for the first admin, rate limits on auth and contact, zod validation on every body, parameterised SQL, link allow-list (blocks `javascript:`), helmet headers, strict CORS, RLS enabled on all tables so Supabase's public API sees nothing, honeypot on the contact form, no IPs stored (salted hash only). Settings are structured JSON that the frontend renders as text, never as HTML.

## Admin sections
Dashboard, Analytics, Content (About, Skills, Services, Projects, Social), Appearance (Theme, Colors, Typography, Animations, Components), Website (Hero, Navigation, Footer, SEO), Chatbot (Settings, FAQs), Contact Messages, Media, Settings, Account.

# Creative Vision Consultancy — Website

The [Creative Vision Consultancy](https://www.creativevisionconsultancy.com/) site refresh. The client chose **Direction A (Editorial Luxe)** with **Direction C's heading font (Fraunces)**. The three original drafts are kept for reference in [design/drafts/](design/drafts/).

| | |
|---|---|
| Site | React Router 7 (framework mode, `ssr: false`), Vite, Tailwind v4. Public pages are **prerendered to static HTML** and hosted on Cloudflare Pages |
| API | Express + Postgres on Railway ([backend/](backend/)), forked from Craft Cart |
| Images | Cloudflare R2, shared `blacktag-media` bucket, `cvc/` prefix |
| Inquiries | Dubsado embed for now; Dubsado vs. discovery-call link is still to be decided with the client ([app/lib/site.ts](app/lib/site.ts) `INQUIRY`) |

## How content gets to the site

The owner manages **services (max 10)**, **portfolio galleries (max 12, 40 photos each)** and **testimonials (max 8)** from the admin (coming next). Everything else is hard-coded.

1. She saves a change in the admin. The API writes it to Postgres.
2. If the change touches anything public (publishing, unpublishing, editing or reordering published items), the API calls the Cloudflare Pages **deploy hook**. Calls are debounced 60s so a burst of edits makes one build.
3. Pages rebuilds. `react-router.config.ts` asks the API for the gallery slugs, and each page's `loader` fetches its content, **at build time**.
4. About two minutes later the change is live as static HTML.

If the API is down during a build, the build fails and the last good deploy stays up.

## Local development

You need Node 22 and a local Postgres.

```bash
# API
cd backend
cp .env.example .env            # defaults work against local Postgres
createdb cvc && npm install
npm run migrate
npm run seed -- --placeholders  # brief copy + stand-in photos
npm run dev                     # http://localhost:8080

# Site (in another terminal, from the repo root)
npm install
npm run dev                     # http://localhost:5173
npm run build                   # prerender into build/client (needs the API running)
```

`npm run seed` without `--placeholders` loads only real content from the brief: six published services, and seven gallery drafts with no photos. That is what production gets.

### Tests

```bash
cd backend && createdb cvc_test && npm run test:migrate && npm test
npm run typecheck   # site
```

The backend suite runs against a real Postgres. It refuses to run unless the database name contains "test", because it truncates every table.

## API

Public (published rows only, in the owner's order): `GET /services`, `GET /portfolio`, `GET /portfolio/:slug`, `GET /testimonials`.

Admin (magic-link session; `POST /admin/auth/dev-login` works locally):

| Route | |
|---|---|
| `GET/POST /admin/{services,portfolio,testimonials}` | List with `{count, limit}`; create. Over the cap returns `409 {code: 'limit_reached'}` |
| `GET/PATCH/DELETE /admin/{…}/:id` | Edit only the fields sent; delete purges R2 images after commit |
| `PUT /admin/{…}/order {ids}` | Full new order. A stale list gets `409` |
| `POST /admin/portfolio/:id/photos {add, remove_ids}` | One transaction; capped at 40 per gallery |
| `PUT /admin/portfolio/:id/photos/order`, `PATCH …/photos/:photoId {alt}` | Photo order and descriptions |
| `POST /admin/upload {data, kind}` | Base64 image to R2 (`503` if R2 not configured) |
| `GET /admin/publish-status`, `POST /admin/publish` | Rebuild status; "publish now" |

## Deploy

- **Railway** (project "CVC Backend"; live API at `https://api-production-c4eae.up.railway.app`):
  - Postgres 18 service, private network only (no public TCP proxy).
  - `api` service, deployed with `railway up backend --path-as-root --service api`. To run one-off scripts inside it, use `railway ssh --service api node scripts/seed.js`. [backend/railway.json](backend/railway.json) runs migrations on start, and its health check is `/health`.
  - Env vars are listed in [backend/.env.example](backend/.env.example). `ALLOWED_ORIGIN` takes a comma-separated list and supports `https://*.cvc-website.pages.dev` for previews.
- **Cloudflare Pages:**
  - Connect the GitHub repo. The Git integration is required for the deploy hook.
  - Build command `npm run build`, output `build/client`, env `VITE_API_BASE_URL`.
  - Create a deploy hook and set it as `PAGES_DEPLOY_HOOK_URL` on Railway.
- [public/_redirects](public/_redirects) sends `/admin/*` to the SPA fallback.

## Content notes

- Hero, intro, about and services fallback photos are the client's own, from the brief PDF (`public/images/`).
- The social/corporate and consulting teaser photos on the home page are Unsplash stand-ins, marked `IMAGE:` in [app/routes/home.tsx](app/routes/home.tsx).
- The owner portrait on About is a placeholder until the client supplies one.
- Copy edits from the brief: "birthdays celebrations" became "birthday celebrations"; "Month of Coordination" became "Month-of Coordination".
- Service descriptions are plain text (blank line = new paragraph) plus an optional bullet list. That was chosen over rich text so nothing she pastes can inject markup into the prerendered pages.

## Status

- [x] Backend: schema, caps, ordering, photos, publish hook, R2, auth (53 tests)
- [x] Public pages: Home, About, Services, Gallery + gallery pages, Inquire; responsive, prerendered
- [ ] Admin UI (login, services / portfolio / testimonials managers, uploads, publish banner)
- [x] Railway: Postgres + API deployed, real brief content seeded (services published, galleries as drafts)
- [ ] Infra: Pages project, `api.` DNS, R2 keys, Loops magic-link template
- [ ] Client inputs: Dubsado decision, owner portrait/name, real reviews, social links, event photos

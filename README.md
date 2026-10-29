# Creative Vision Consultancy — Website

The [Creative Vision Consultancy](https://www.creativevisionconsultancy.com/) site refresh. The client chose **Direction A (Editorial Luxe)** with **Direction C's heading font (Fraunces)**. The three original drafts are kept for reference in [design/drafts/](design/drafts/).

| | |
|---|---|
| Site | React Router 7 (framework mode, `ssr: false`), Vite, Tailwind v4. Public pages are **prerendered to static HTML** and hosted on GitHub Pages, behind Cloudflare DNS at launch |
| API | Express + Postgres on Railway ([backend/](backend/)), forked from Craft Cart |
| Images | Cloudflare Images (shared BlackTag account). Uploads are tagged `project=cvc`, and only tagged images are ever deleted. Postgres stores only delivery URLs |
| Inquiries | Dubsado embed for now; Dubsado vs. discovery-call link is still to be decided with the client ([app/lib/site.ts](app/lib/site.ts) `INQUIRY`) |

## How content gets to the site

The owner manages **services (max 10)**, **portfolio galleries (max 12, 40 photos each)** and **testimonials (max 8)** from the admin (coming next). Everything else is hard-coded.

1. She saves a change in the admin. The API writes it to Postgres.
2. If the change touches anything public (publishing, unpublishing, editing or reordering published items), the API starts the **Deploy site** GitHub Actions workflow. Calls are debounced 60s so a burst of edits makes one build.
3. The workflow rebuilds the site. `react-router.config.ts` asks the API for the gallery slugs, and each page's `loader` fetches its content, **at build time**.
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
BASE_PATH=/creative-vision-consultancy/ npm run build:pages   # exactly what GitHub Pages serves
BASE_PATH=/creative-vision-consultancy/ npm run preview       # serve it the way GitHub Pages does
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
| `GET/PATCH/DELETE /admin/{…}/:id` | Edit only the fields sent; delete removes its Cloudflare images after commit |
| `PUT /admin/{…}/order {ids}` | Full new order. A stale list gets `409` |
| `POST /admin/portfolio/:id/photos {add, remove_ids}` | One transaction; capped at 40 per gallery |
| `PUT /admin/portfolio/:id/photos/order`, `PATCH …/photos/:photoId {alt}` | Photo order and descriptions |
| `POST /admin/upload {data, kind}` | Base64 image to Cloudflare Images (`503` if not configured) |
| `GET /admin/publish-status`, `POST /admin/publish` | Rebuild status; "publish now" |

## Deploy

- **Railway** (project "CVC Backend"; live API at `https://api-production-c4eae.up.railway.app`):
  - Postgres 18 service, private network only (no public TCP proxy).
  - `api` service, deployed with `railway up backend --path-as-root --service api`. To run one-off scripts inside it, use `railway ssh --service api node scripts/seed.js`. [backend/railway.json](backend/railway.json) runs migrations on start, and its health check is `/health`.
  - Env vars are listed in [backend/.env.example](backend/.env.example). `ALLOWED_ORIGIN` takes a comma-separated list: `https://blacktagdevs.github.io` now, plus the custom domain at launch.
- **GitHub Pages** ([.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)):
  - Repo Settings → Pages → Source is **GitHub Actions**. Every push to `main` deploys.
  - Repo variable `VITE_API_BASE_URL` points the build at the API. `BASE_PATH` defaults to `/creative-vision-consultancy/` (the project URL); set it to `/` when the custom domain is connected.
  - [scripts/assemble-pages.mjs](scripts/assemble-pages.mjs) lifts the prerendered pages beside the assets and copies the SPA fallback to `404.html`, so `/admin` and any other non-prerendered path loads the app.
  - Rebuilds after publishing: a fine-grained GitHub token with **Actions: Read and write** on this repo only, set as `GITHUB_DEPLOY_TOKEN` on Railway.

## Content notes

- Hero, intro, about and services fallback photos are the client's own, from the brief PDF (`public/images/`).
- The social/corporate and consulting teaser photos on the home page are Unsplash stand-ins, marked `IMAGE:` in [app/routes/home.tsx](app/routes/home.tsx).
- The owner portrait on About is a placeholder until the client supplies one.
- Copy edits from the brief: "birthdays celebrations" became "birthday celebrations"; "Month of Coordination" became "Month-of Coordination".
- Service descriptions are plain text (blank line = new paragraph) plus an optional bullet list. That was chosen over rich text so nothing she pastes can inject markup into the prerendered pages.

## Status

- [x] Backend: schema, caps, ordering, photos, publish trigger, Cloudflare Images, auth (51 tests)
- [x] Public pages: Home, About, Services, Gallery + gallery pages, Inquire; responsive, prerendered
- [ ] Admin UI (login, services / portfolio / testimonials managers, uploads, publish banner)
- [x] Railway: Postgres + API deployed, real brief content seeded (services published, galleries as drafts)
- [x] GitHub Pages deploy workflow
- [ ] Infra: `GITHUB_DEPLOY_TOKEN` and `CF_*` image keys on Railway, then `railway ssh --service api node scripts/setup-image-variants.js`; Loops magic-link template; custom domain
- [ ] Client inputs: Dubsado decision, owner portrait/name, real reviews, social links, event photos

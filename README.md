# Creative Vision Consultancy — Website

The [Creative Vision Consultancy](https://www.cvconsultancy.co/) site refresh. The client chose **Direction A (Editorial Luxe)** with **Direction C's heading font (Fraunces)**. The three original drafts are kept for reference in [design/drafts/](design/drafts/).

| | |
|---|---|
| Site | React Router 7 (framework mode, `ssr: false`), Vite, Tailwind v4. Public pages are **prerendered to static HTML** and hosted on GitHub Pages at `www.cvconsultancy.co` (DNS on Cloudflare) |
| API | Express + Postgres on Railway ([backend/](backend/)), forked from Craft Cart |
| Images | Cloudflare Images, in CVC's own Cloudflare account ("CVC Site"). Uploads are tagged `project=cvc`, and only tagged images are ever deleted. Postgres stores only delivery URLs; the site picks the `cvcthumb` (900px) or `cvclarge` (2000px) size |
| Inquiries | Dubsado embed for now; Dubsado vs. discovery-call link is still to be decided with the client ([app/lib/site.ts](app/lib/site.ts) `INQUIRY`) |

## How content gets to the site

The owner manages **services (max 10)**, **portfolio galleries (max 12, 40 photos each)** and **testimonials (max 8)** from the admin at `/admin`. Everything else is hard-coded. Inquiries are not in the admin: they arrive in her Dubsado account, and the dashboard links there.

1. She saves a change in the admin. The API writes it to Postgres.
2. **Visitors see it on their next page load.** Every page is prerendered, then re-fetches its content from the public API in the browser (`clientLoader` + [app/lib/live.ts](app/lib/live.ts)), the same way Craft Cart works. If the API can't be reached, the page keeps its prerendered content.
3. **Search engines see it within a few hours.** The [deploy workflow](.github/workflows/deploy-pages.yml) rebuilds the static HTML on every push to `main` and on an hourly schedule, but GitHub delays scheduled runs under load: in practice they land every 4–8 hours. Use **Actions → Deploy site → Run workflow** to rebuild sooner. Galleries published since the last build load through the `404.html` app shell until then. If no gallery was published at build time, the build uses a browser-only gallery page ([app/routes/gallery-item-live.tsx](app/routes/gallery-item-live.tsx)), so a gallery published afterwards still opens.

Nothing in Railway talks to GitHub: there's no deploy token. If the API is down during a build, the build fails and the last good deploy stays up.

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
npm run build:pages             # exactly what GitHub Pages serves
npm run preview                 # serve it the way GitHub Pages does
```

The admin is at http://localhost:5173/admin. Sign in with an address from `ADMIN_EMAILS`. Without the `LOOPS_*` keys no email is sent: the API prints the login link to its console instead, so open it from there. There is no other way in, locally or in production. Without Cloudflare keys, uploaded photos are kept inline as data URIs (local only; production refuses them).

`npm run seed` without `--placeholders` loads only real content from the brief: six published services, and seven gallery drafts with no photos. That is what production gets.

### Tests

```bash
cd backend && createdb cvc_test && npm run test:migrate && npm test
npm run typecheck   # site
```

The backend suite runs against a real Postgres. It refuses to run unless the database name contains "test", because it truncates every table.

## API

Public (published rows only, in the owner's order): `GET /services`, `GET /portfolio`, `GET /portfolio/:slug`, `GET /testimonials`.

Admin (magic-link session from `POST /admin/auth/request {email}`, emailed through Loops):

| Route | |
|---|---|
| `GET/POST /admin/{services,portfolio,testimonials}` | List with `{count, limit}`; create. Over the cap returns `409 {code: 'limit_reached'}` |
| `GET/PATCH/DELETE /admin/{…}/:id` | Edit only the fields sent; delete removes its Cloudflare images after commit |
| `PUT /admin/{…}/order {ids}` | Full new order. A stale list gets `409` |
| `POST /admin/portfolio/:id/photos {add, remove_ids}` | One transaction; capped at 40 per gallery |
| `PUT /admin/portfolio/:id/photos/order`, `PATCH …/photos/:photoId {alt}` | Photo order and descriptions |
| `accent` on a gallery | One of `blush`, `sage`, `champagne`, `dusk`, `clay` (default `blush`). Tints its card on `/gallery`, its page header and its home tile. Tones live in `app/app.css` and [app/lib/accent.ts](app/lib/accent.ts) |
| `POST /admin/upload {data, kind}` | Base64 image to Cloudflare Images (`503` if not configured) |

## Deploy

- **Railway** (project "CVC Backend"; live API at `https://api-production-c4eae.up.railway.app`):
  - Postgres 18 service, private network only (no public TCP proxy).
  - `api` service, deployed with `railway up backend --path-as-root --service api`. To run one-off scripts inside it, use `railway ssh --service api node scripts/seed.js`. [backend/railway.json](backend/railway.json) runs migrations on start, and its health check is `/health`.
  - Env vars are listed in [backend/.env.example](backend/.env.example). `ALLOWED_ORIGIN` takes a comma-separated list: `https://www.cvconsultancy.co,https://cvconsultancy.co`. Add an origin here before serving the site from anywhere else (an `https://*.example.com` entry matches one subdomain level). Visitors' browsers call the public API, so a missing origin means pages silently show their last-built content. `ADMIN_APP_URL` is where a login link lands: `https://www.cvconsultancy.co/admin`.
  - Admin sign-in emails go through Loops (`LOOPS_API_KEY`, `LOOPS_MAGIC_LINK_TEMPLATE_ID`; the template uses the data variable `loginUrl`). `ADMIN_EMAILS` is the allowlist: `hello@cvconsultancy.co` and `cameron@blacktagdevs.com`.
- **Cloudflare Images:** the `CF_*` vars on Railway point at the "CVC Site" account. The two sizes were created once with `railway ssh --service api node scripts/setup-image-variants.js`. It's safe to re-run if a size changes in [backend/src/lib/images.js](backend/src/lib/images.js).
- **GitHub Pages** ([.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)), live at https://www.cvconsultancy.co:
  - Repo Settings → Pages → Source is **GitHub Actions**, custom domain `www.cvconsultancy.co`, HTTPS enforced. Every push to `main` deploys, and so does the hourly schedule (which GitHub often runs hours late).
  - Repo variables: `VITE_API_BASE_URL` points the build at the API, and `BASE_PATH=/` because the site sits at the domain root. (Without the variable it builds for the old project URL, `/creative-vision-consultancy/`.)
  - Cloudflare DNS for `cvconsultancy.co`: four `A` records on the apex to GitHub Pages (`185.199.108–111.153`) and `www` as a `CNAME` to `blacktagdevs.github.io`, all **DNS only** (grey cloud), so GitHub issues and renews the certificate. GitHub redirects the apex to `www`. The MX and TXT records are the client's Google Workspace mail; leave them alone.
  - The old domain, `creativevisionconsultancy.com`, is on Squarespace. Its redirect to `www.cvconsultancy.co` is set up there, not here.
  - [scripts/assemble-pages.mjs](scripts/assemble-pages.mjs) lifts the prerendered pages beside the assets and copies the SPA fallback to `404.html`, so `/admin` and any other non-prerendered path loads the app.

## Content notes

- Hero, intro, about and services fallback photos are the client's own, from the brief PDF (`public/images/`).
- The logo (`public/images/logo.png`, via [app/components/Logo.tsx](app/components/Logo.tsx)) is the client's 500px PNG with its empty margins cropped. It's in the nav, footer, admin header and sign-in screen; over the home hero it is flattened to white. The favicon is still the "CVC" monogram, because the script wordmark is unreadable at 16px.
- The social/corporate and consulting teaser photos on the home page are Unsplash stand-ins, marked `IMAGE:` in [app/routes/home.tsx](app/routes/home.tsx).
- The owner portrait on About is a placeholder until the client supplies one.
- Copy edits from the brief: "birthdays celebrations" became "birthday celebrations"; "Month of Coordination" became "Month-of Coordination".
- Service descriptions are plain text (blank line = new paragraph) plus an optional bullet list. That was chosen over rich text so nothing she pastes can inject markup into the prerendered pages.

## Status

- [x] Backend: schema, caps, ordering, photos, Cloudflare Images, auth (51 tests)
- [x] Public pages: Home, About, Services, Gallery + gallery pages, Inquire; responsive, prerendered
- [x] Admin UI (login, dashboard, galleries with photos and color, services, testimonials)
- [x] Railway: Postgres + API deployed, real brief content seeded (services published, galleries as drafts)
- [x] GitHub Pages: deploying from Actions, live at the project URL
- [x] Cloudflare Images: keys on Railway, image sizes created, upload/resize/delete verified
- [x] Loops: magic-link email live; admin sign-in is email-link only
- [ ] Custom domain: `www.cvconsultancy.co` on GitHub Pages; `creativevisionconsultancy.com` redirect on Squarespace
- [ ] Client inputs: Dubsado decision, owner portrait/name, real reviews, social links, event photos

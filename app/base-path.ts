// Where the site is served from, set at build time. GitHub Pages serves this
// repo at blacktagdevs.github.io/creative-vision-consultancy/ until the custom
// domain is connected; locally and on the custom domain it's the root.
export const BASE_PATH = ((p) => (p.endsWith('/') ? p : `${p}/`))(process.env.BASE_PATH || '/')

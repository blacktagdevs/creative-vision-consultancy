// Files in public/ live under the site's base path: "/" on the custom domain,
// "/creative-vision-consultancy/" on the GitHub Pages project URL. Links go
// through React Router, which adds the base itself; raw src/href strings don't.
export function asset(path: string) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`
}

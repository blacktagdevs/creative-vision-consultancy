// Express 4 doesn't forward a rejected promise to the error handler on its
// own, so every async route goes through this.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

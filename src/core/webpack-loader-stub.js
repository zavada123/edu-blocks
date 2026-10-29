// The VM loads third-party extensions through webpack loaders (a worker and an iframe).
// This package loads only its own hero extension, so these imports resolve here and stay unused.
module.exports = function unavailable() {
  throw new Error("Сторонні розширення не підтримуються")
}

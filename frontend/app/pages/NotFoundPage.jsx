import React from "react";

/**
 * Ruta comodín: captura URLs no definidas (p. ej. /.well-known/... de Chrome DevTools)
 * y evita que el router lance "No route matches URL".
 */
export default function NotFoundPage() {
  return null;
}

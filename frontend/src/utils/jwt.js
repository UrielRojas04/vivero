// Decodifica sólo el payload de un JWT para leer su `exp` (segundos epoch) del lado del cliente.
// NO valida la firma -- eso lo sigue haciendo el backend en cada request (JwtFilter); esto es
// pura conveniencia de UX para no dejar "entrar" a una pantalla protegida con un token que ya
// sabemos vencido, sin tener que esperar a que la primera llamada a la API falle con 401.
// Sin librería nueva: atob() + JSON.parse alcanza para esto.
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false; // sin exp, no hay forma de saber -- no lo tratamos como vencido
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // token corrupto/ilegible: tratarlo como vencido, más seguro que asumir válido
  }
}

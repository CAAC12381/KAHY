// Permite que las pruebas importen el código de src/ y api/ tal como está escrito:
// Vite acepta "./archivo" sin extensión y "./archivo.js" para un .ts; Node no.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith(".") || specifier.startsWith("/");
    if (!relative) throw error;
    const candidates = specifier.endsWith(".js") ? [`${specifier.slice(0, -3)}.ts`] : /\.[a-z]+$/i.test(specifier) ? [] : [`${specifier}.ts`, `${specifier}.tsx`];
    for (const candidate of candidates) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // Se prueba la siguiente extensión.
      }
    }
    throw error;
  }
}

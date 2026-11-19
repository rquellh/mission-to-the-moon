/** True when this browser can draw the 3D scene (WebGL 2), checked once on a throwaway canvas, quietly (three.js would log errors). */
let available: boolean | null = null;
export function webGL2Available(): boolean {
  if (available !== null) return available;
  available = false;
  if (typeof WebGL2RenderingContext !== 'undefined') {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      available = context !== null;
      // Hand the trial context back at once.
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      available = false;
    }
  }
  return available;
}

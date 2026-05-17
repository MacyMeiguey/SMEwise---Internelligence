import type { RootState } from '@react-three/fiber';

/**
 * Browsers may reclaim the WebGL context (GPU memory, tab backgrounding, multiple canvases).
 * preventDefault keeps recovery possible; without it the page can stay broken until reload.
 */
export function onGlCreatedAllowRecovery({ gl }: Pick<RootState, 'gl'>): void {
  const el = gl.domElement;
  el.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );
}

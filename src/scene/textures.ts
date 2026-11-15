import {
  LoadingManager,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';

export type TextureTier = '2k' | '4k';

export interface StageTextures {
  readonly earth: Texture;
  readonly moon: Texture;
  readonly stars: Texture;
}

interface NavigatorHints {
  readonly deviceMemory?: number;
  readonly connection?: { readonly saveData?: boolean };
}

/**
 * Pick the 2K set for small or low-capability devices and the 4K set
 * otherwise. Add ?textures=2k or ?textures=4k to the URL to override.
 */
export function chooseTextureTier(maxTextureSize: number): TextureTier {
  const override = new URLSearchParams(window.location.search).get('textures');
  if (override === '2k' || override === '4k') {
    return override === '4k' && maxTextureSize < 4096 ? '2k' : override;
  }

  if (maxTextureSize < 4096) return '2k';

  const hints = navigator as Navigator & NavigatorHints;
  if (hints.connection?.saveData === true) return '2k';
  if (hints.deviceMemory !== undefined && hints.deviceMemory < 4) return '2k';

  // Phones and small tablets: short screen side under 768 CSS pixels.
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (shortSide < 768) return '2k';

  // Touch-only devices (no mouse or trackpad) tend to have tighter GPU memory.
  const touchOnly =
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches;
  if (touchOnly) return '2k';

  return '4k';
}

/**
 * Load the Earth, Moon, and star textures for a tier.
 * `onProgress` receives the number of files loaded so far and the total.
 */
export function loadStageTextures(
  tier: TextureTier,
  maxAnisotropy: number,
  onProgress: (loaded: number, total: number) => void,
): Promise<StageTextures> {
  return new Promise((resolve, reject) => {
    const manager = new LoadingManager();
    manager.onProgress = (_url, loaded, total) => onProgress(loaded, total);

    const loader = new TextureLoader(manager);
    const base = `${import.meta.env.BASE_URL}textures/`;
    const failures: string[] = [];

    const load = (name: string): Texture =>
      loader.load(`${base}${name}-${tier}.jpg`, undefined, undefined, () => {
        failures.push(name);
      });

    const earth = load('earth');
    const moon = load('moon');
    const stars = load('stars');

    for (const texture of [earth, moon, stars]) {
      texture.colorSpace = SRGBColorSpace;
    }
    const anisotropy = Math.min(maxAnisotropy, 8);
    earth.anisotropy = anisotropy;
    moon.anisotropy = anisotropy;

    // The star map is drawn as seen from inside the celestial sphere (right
    // ascension increases to the left). Mirror it horizontally so it reads
    // correctly on the inside of a sphere. See src/scene/stars.ts.
    stars.wrapS = RepeatWrapping;
    stars.repeat.x = -1;

    manager.onLoad = () => {
      if (failures.length > 0) {
        reject(new Error(`Could not load textures: ${failures.join(', ')}`));
      } else {
        resolve({ earth, moon, stars });
      }
    };
    manager.onError = (url) => {
      // onLoad still fires after errors; this keeps a record in the console.
      console.warn(`Texture failed to load: ${url}`);
    };
  });
}

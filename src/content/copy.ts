import { EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS } from './physical-constants';

/** Interface text, kept in one place so later steps can revise it easily. */
export const copy = {
  siteTitle: 'Mission to the Moon',
  canvasLabel:
    '3D view of Earth, the Moon, and stars. Drag or swipe to turn the view; scroll or pinch to zoom. When focused, arrow keys turn the view and the plus and minus keys zoom.',
  loading: 'Loading Earth, the Moon, and stars…',
  scaleNote: {
    readable: 'Distances not to scale',
    true: `True scale: the Moon is about ${Math.round(EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS)} Earth-widths away`,
  },
  errors: {
    noWebGL:
      'This 3D view needs WebGL 2, which this browser or device does not have turned on. Try a current version of Chrome, Edge, Firefox, or Safari, or turn on hardware acceleration in your browser settings.',
    contextLost:
      'The 3D view stopped because the graphics processor reset. It should recover on its own; if it does not, reload the page.',
    textures:
      'Some images for the 3D view did not load. Check your connection and reload the page.',
  },
} as const;

import { Color, Vector3, type MeshLambertMaterial, type MeshStandardMaterial } from 'three';

export interface NightSide {
  /** Point the day side toward the Sun (unit vector, world space). */
  setSunDirection(direction: Vector3): void;
}

/**
 * Give a globe's material a floor of light on its night side, so continents,
 * oceans, and craters stay readable there while the Sun still sets the day
 * side and the terminator. The floor is the surface color times `tint`
 * (linear), faded out across the terminator, so the day side is unchanged.
 */
export function addNightSide(material: MeshLambertMaterial | MeshStandardMaterial, tint: Color): NightSide {
  const uniforms = {
    uNightSun: { value: new Vector3(1, 0, 0) },
    uNightTint: { value: tint.clone() },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNightNormal;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvNightNormal = normalize(mat3(modelMatrix) * objectNormal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uNightSun;\nuniform vec3 uNightTint;\nvarying vec3 vNightNormal;',
      )
      .replace(
        '#include <opaque_fragment>',
        [
          'float nightSun = dot(normalize(vNightNormal), uNightSun);',
          'outgoingLight += diffuseColor.rgb * uNightTint * (1.0 - smoothstep(-0.25, 0.15, nightSun));',
          '#include <opaque_fragment>',
        ].join('\n'),
      );
  };
  material.customProgramCacheKey = () => 'night-side';
  material.needsUpdate = true;
  return {
    setSunDirection(direction) {
      uniforms.uNightSun.value.copy(direction).normalize();
    },
  };
}

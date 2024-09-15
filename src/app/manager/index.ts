import BackgroundManager from "./background-manager";
import MapManager from "./map-manager";
import CharacterManager from "./character-manager";
import EffectBehindCharacterManager from "./effect-behind-character-manager";

/** 계산 시간을 줄이기 위해, 지나간 시간을 소수 1자리로 간소화 */
export function floorDeltaTime(deltaTime: number): number {
  return Math.floor(deltaTime * 10) / 10;
}

export {
  BackgroundManager,
  MapManager,
  CharacterManager,
  EffectBehindCharacterManager,
};

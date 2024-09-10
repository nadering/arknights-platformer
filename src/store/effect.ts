import { atom } from "jotai";

export type degree = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

interface DashEffectType {
  active: boolean;
  degree: degree;
  xPos: number;
  yPos: number;
}

export const dashEffectAtom = atom<DashEffectType>({
  active: false,
  degree: 0,
  xPos: 0,
  yPos: 0,
});

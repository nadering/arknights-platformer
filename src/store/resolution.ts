import { atom } from "jotai";

interface ResolutionType {
  width: number;
  height: number;
}

/** 기본 해상도를 640 x 360 (16:9)로 설정 */
export const resolutionAtom = atom<ResolutionType>({
  width: 640,
  height: 360,
});

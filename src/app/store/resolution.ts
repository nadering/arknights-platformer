import { atom } from "jotai";

interface ResolutionType {
  width: number;
  height: number;
}

/** 기본 해상도를 1920 x 1080 (16:9)로 설정 */
export const resolutionAtom = atom<ResolutionType>({
  width: 1920,
  height: 1080,
});

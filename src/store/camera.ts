import { atom } from "jotai";

/** 카메라 시점 타입 */
export interface CameraType {
  xPos: number;
  yPos: number;
}

/** 카메라 시점 */
export const cameraAtom = atom<CameraType>({ xPos: 0, yPos: 0 });

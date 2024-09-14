import { atom } from "jotai";

/** 각도(8방향) 타입 */
export type degree = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

interface DashOldEffectType {
  active: boolean;
  degree: degree;
  xPos: number;
  yPos: number;
}

export const dashOldEffectAtom = atom<DashOldEffectType>({
  active: false,
  degree: 0,
  xPos: 0,
  yPos: 0,
});

/** 대시 이펙트에 사용되는 잔상 타입 */
export interface DashAfterImageType {
  xPos: number; // 위치
  yPos: number;
  xSize: number; // 크기
  ySize: number;
  displayCount: number; // 잔상의 재생 가능 횟수
  direction: "left" | "right";
}

/** 대시 이펙트 타입 */
export interface DashEffectType {
  active: boolean; // 활성화 여부
  effectCount: number; // 잔상 개수
  interval: number; // 잔상 추가 및 렌더링 간격
  afterImageList: DashAfterImageType[]; // 잔상 목록
}

/** 대시 이펙트 정보를 담고 있는 아톰 
 * - (2 * effectCount - 1) * interval의 값은 대시 재사용 대기시간인 200(ms)를 초과해서는 안 됨 
 * */
export const dashEffectAtom = atom<DashEffectType>({
  active: false,
  effectCount: 8,
  interval: 13,
  afterImageList: [],
})

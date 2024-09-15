import { allStaticMapData } from "@/data";
import { Block } from "@map";
import { atom } from "jotai";

/** 정적 타일 맵 */
export interface StaticMapDataType {
  scroll: boolean;
  column: number;
  row: number;
  tileSize: number;
  tileList: number[][];
}

/** 맵에 저장될 타일 종류 */
export type TileType = Block | null;

/** 맵 데이터와 생성될 객체를 연관짓는 타입 */
export const TileMapping: { [key: number]: string } = {
  0: "blank",
  10: "block-0",
  11: "block-1",
  12: "block-2",
  13: "block-3",
}

/** 데이터로 구현된 정적 타일 맵 */
export interface StaticMapType {
  scroll: boolean;
  column: number;
  row: number;
  width: number;
  height: number;
  tileList: TileType[][] | null;
}

export const currentMapDataAtom = atom<StaticMapDataType>(allStaticMapData[1]);

export const currentMapAtom = atom<StaticMapType>({
  scroll: false,
  column: 0,
  row: 0,
  width: 0,
  height: 0,
  tileList: null,
})
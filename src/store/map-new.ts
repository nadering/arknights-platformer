import { allTiledStaticMapData } from "@/data";
import { BlockNew } from "@map";
import { atom } from "jotai";

/** 맵에 저장될 타일 종류 */
export type TileNewType = BlockNew | null;

/** 캐릭터와 충돌하지 않는 스프라이트 번호 목록 */
// 타일 위에 덮이는 눈
const snowList = [50, 51, 52, 53, 54, 55];

// 얼음 수정 (가시 아님)
const crystalList = [
  1091, 1094, 1095, 1049, 1050, 1097, 1098, 1052, 1053, 1054, 1055, 1100, 1101,
  1102, 1103, 1187, 1190, 1191, 1193, 1194, 1241, 1242, 1196, 1197, 1198, 1199,
  1244, 1245, 1246, 1247,
];
export const noCollisionList = [-1].concat(snowList).concat(crystalList);

/** 캐릭터와 충돌하면 따로 처리해야 하는 스프라이트 번호 목록 */
// 가시
const spikeList = [1331, 1334, 1337, 1340, 1427, 1430, 1433, 1436];
export const dangerCollisionList = spikeList.slice();

/** Tiled로 생성한 정적 타일 맵 */
export interface TiledStaticMapDataType {
  scroll: boolean;
  column: number;
  row: number;
  tileSize: number;
  tileList: number[];
}

/** 데이터로 구현된 Tiled로 생성한 정적 타일 맵 */
export interface TiledStaticMapType {
  scroll: boolean;
  column: number;
  row: number;
  width: number;
  height: number;
  tileList: TileNewType[][] | null;
}

export const currentTiledMapDataAtom = atom<TiledStaticMapDataType>(
  allTiledStaticMapData[1]
);

export const currentTiledMapAtom = atom<TiledStaticMapType>({
  scroll: false,
  column: 0,
  row: 0,
  width: 0,
  height: 0,
  tileList: null,
});

"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue, useAtom } from "jotai";
import {
  cameraAtom,
  currentTiledMapAtom,
  currentTiledMapDataAtom,
  noCollisionList,
  resolutionAtom,
  TileNewType,
} from "@store";
import Canvas from "@canvas";
import { BlockNew, CollidableDirection } from "@map";
import { floorDeltaTime } from ".";

/** 맵을 담당하는 매니저 */
export default function MapManagerNew() {
  // 캔버스
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 이전 프레임이 렌더링된 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 맵
  const tileList = useRef<TileNewType[][]>([]);
  const currentTiledMapData = useAtomValue(currentTiledMapDataAtom);
  const [currentTiledMap, setCurrentTiledMap] = useAtom(currentTiledMapAtom);

  // 카메라
  const camera = useAtomValue(cameraAtom);
  const cameraXPos = useRef<number>(0);
  const cameraYPos = useRef<number>(0);

  // 성능을 위한 FPS 제한
  const fps = 90;
  const frameInterval = 1000 / fps; // 렌더링 간격

  // 렌더링 요청
  const renderBroadcast = (currentTime: number) => {
    // 캔버스 레퍼런스에서 컨텍스트를 로드하고,
    // 컨텍스트가 로드되지 않았다면 진행하지 않음
    const context = canvasRef.current!.getContext("2d");
    if (!context) return;

    // 이전 프레임 이후 얼마나 시간이 지났는지 계산
    const deltaTime = floorDeltaTime(currentTime - previousTimeRef.current);

    // 프레임 간 시간 차이가 프레임 간격보다 작으면, 렌더링하지 않음
    if (deltaTime < frameInterval) {
      return requestAnimationFrame(renderBroadcast);
    } else {
      previousTimeRef.current = currentTime;
    }

    // 맵 렌더링 (currentMap이 업데이트되지 않는 이슈가 있어, 에러 방지를 위해 다음과 같이 별도로 처리)
    context.clearRect(0, 0, resolution.width, resolution.height);
    const map = currentTiledMap.tileList
      ? currentTiledMap
      : currentTiledMapData;
    const tiles = currentTiledMap.tileList
      ? currentTiledMap.tileList
      : tileList.current;

    for (let row = 0; row < map.row; row++) {
      for (let column = 0; column < map.column; column++) {
        const currentTile = tiles[row][column];
        if (currentTile) {
          // 빈 칸이 아닌 타일이면 카메라 이동을 확인하고,
          const movedXPos = currentTile.xPos - cameraXPos.current;
          const movedYPos = currentTile.yPos - cameraYPos.current;

          if (
            !(
              movedXPos + currentTile.xSize < 0 || movedXPos > resolution.width
            ) &&
            !(
              movedYPos + currentTile.ySize < 0 || movedYPos > resolution.height
            )
          ) {
            // 화면 내에 보이는 블록만 렌더링
            currentTile.render({
              context,
              cameraXPos: cameraXPos.current,
              cameraYPos: cameraYPos.current,
            });
          }
        }
      }
    }

    // 다음 프레임에서 렌더링 재요청
    requestAnimationFrame(renderBroadcast);
  };

  useEffect(() => {
    // 캔버스가 로드되지 않았다면 진행하지 않음
    if (!canvasRef) return;

    // 데이터에서 맵 로드
    for (let row = 0; row < currentTiledMapData.row; row++) {
      const rowList: TileNewType[] = [];
      for (let column = 0; column < currentTiledMapData.column; column++) {
        const currentTile =
          currentTiledMapData.tileList[
            row * currentTiledMapData.column + column
          ];

        if (currentTile == 0) {
          // 빈 칸이면 객체를 생성하지 않음
          rowList.push(null);
        } else {
          const block = new BlockNew({
            tileNumber: currentTile - 1,
            xPos: currentTiledMapData.tileSize * column,
            yPos: currentTiledMapData.tileSize * row,
            xSize: currentTiledMapData.tileSize,
            ySize: currentTiledMapData.tileSize,
          });

          // 블록의 상하좌우를 검사한 후, 충돌 여부를 설정
          const collidable: CollidableDirection[] = [];
          if (noCollisionList.includes(currentTile - 1)) {
            // 충돌하지 않는 블록이면, 충돌 여부를 추가하지 않음
            block.collidable = collidable;
          } else {
            if (row != 0) {
              if (
                noCollisionList.includes(
                  currentTiledMapData.tileList[
                    (row - 1) * currentTiledMapData.column + column
                  ] - 1
                )
              ) {
                collidable.push("top");
              }
            }
            if (row != currentTiledMapData.row - 1) {
              // 하
              if (
                noCollisionList.includes(
                  currentTiledMapData.tileList[
                    (row + 1) * currentTiledMapData.column + column
                  ] - 1
                )
              ) {
                collidable.push("bottom");
              }
            }
            if (column != 0) {
              // 좌
              if (
                noCollisionList.includes(
                  currentTiledMapData.tileList[
                    row * currentTiledMapData.column + column - 1
                  ] - 1
                )
              ) {
                collidable.push("left");
              }
            }
            if (column != currentTiledMapData.column - 1) {
              // 우
              if (
                noCollisionList.includes(
                  currentTiledMapData.tileList[
                    row * currentTiledMapData.column + column + 1
                  ] - 1
                )
              ) {
                collidable.push("right");
              }
            }
            block.collidable = collidable;
          }
          rowList.push(block);
        }
      }
      tileList.current.push(rowList);
    }

    // 현재 맵 설정
    setCurrentTiledMap({
      scroll: currentTiledMapData.scroll,
      column: currentTiledMapData.column,
      row: currentTiledMapData.row,
      width: currentTiledMapData.column * currentTiledMapData.tileSize,
      height: currentTiledMapData.row * currentTiledMapData.tileSize,
      tileList: tileList.current.slice(),
    });

    // 렌더링 요청
    let requestAnimationId: number;
    if (canvasRef.current) {
      requestAnimationId = requestAnimationFrame(renderBroadcast);

      return () => {
        // 컴포넌트가 사라질 때, 진행되던 렌더링을 취소
        cancelAnimationFrame(requestAnimationId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution.width, resolution.height, currentTiledMapData, canvasRef]);

  // 카메라 이동을 반영
  useEffect(() => {
    cameraXPos.current = camera.xPos;
    cameraYPos.current = camera.yPos;
  }, [camera]);

  return (
    <>
      <Canvas canvasRef={canvasRef} zIndex={10} />
    </>
  );
}

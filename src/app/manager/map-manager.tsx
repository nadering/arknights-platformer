"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue, useAtom } from "jotai";
import {
  cameraAtom,
  currentMapAtom,
  currentMapDataAtom,
  resolutionAtom,
  TileType,
} from "@store";
import Canvas from "@canvas";
import { Block, CollidableDirection } from "@map";
import { floorDeltaTime } from ".";

/** 맵을 담당하는 매니저 */
export default function MapManager() {
  // 캔버스
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 이전 프레임이 렌더링된 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 맵
  const tileList = useRef<TileType[][]>([]);
  const currentMapData = useAtomValue(currentMapDataAtom);
  const [currentMap, setCurrentMap] = useAtom(currentMapAtom);

  // 카메라
  const camera = useAtomValue(cameraAtom);
  const cameraXPos = useRef<number>(0);
  const cameraYPos = useRef<number>(0);

  // 성능을 위한 FPS 제한
  const fps = 120;
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
    const map = currentMap.tileList ? currentMap : currentMapData;
    const tiles = currentMap.tileList ? currentMap.tileList : tileList.current;

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
    for (let row = 0; row < currentMapData.row; row++) {
      const rowList: TileType[] = [];
      for (let column = 0; column < currentMapData.column; column++) {
        // 현재 체크할 타일
        const currentTile = currentMapData.tileList[row][column];

        switch (Math.floor(currentTile / 10)) {
          case 0:
            // 빈 칸이면 객체를 생성하지 않음
            rowList.push(null);
            break;
          case 1:
            // 블록을 생성 (1x로 표현되며, x는 이미지 종류를 나타냄)
            const block = new Block();
            block.setSize(currentMapData.tileSize);
            block.setPos({
              xPos: currentMapData.tileSize * column,
              yPos: currentMapData.tileSize * row,
            });
            block.setImage(currentTile % 10);

            // 블록의 상하좌우를 검사한 후, 충돌 여부를 설정
            const collidable: CollidableDirection[] = [];
            if (row != 0) {
              // 상
              if (currentMapData.tileList[row - 1][column] == 0) {
                collidable.push("top");
              }
            }
            if (row != currentMapData.row - 1) {
              // 하
              if (currentMapData.tileList[row + 1][column] == 0) {
                collidable.push("bottom");
              }
            }
            if (column != 0) {
              // 좌
              if (currentMapData.tileList[row][column - 1] == 0) {
                collidable.push("left");
              }
            }
            if (column != currentMapData.column - 1) {
              // 우
              if (currentMapData.tileList[row][column + 1] == 0) {
                collidable.push("right");
              }
            }
            block.collidable = collidable;

            // 현재 맵에 추가
            rowList.push(block);
            break;
        }
      }
      tileList.current.push(rowList);
    }

    // 현재 맵 설정
    setCurrentMap({
      scroll: currentMapData.scroll,
      column: currentMapData.column,
      row: currentMapData.row,
      width: currentMapData.column * currentMapData.tileSize,
      height: currentMapData.row * currentMapData.tileSize,
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
  }, [resolution.width, resolution.height, currentMapData, canvasRef]);

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

"use client";

import React, { RefObject, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";
import {
  BackgroundFar,
  BackgroundFarHandle,
  BackgroundNear,
  BackgroundNearHandle,
} from "@map";

interface BackgroundManagerProps {
  backgroundCanvasRef: RefObject<HTMLCanvasElement>;
}

/** 배경화면을 담당하는 컴포넌트 */
export default function BackgroundManager({ backgroundCanvasRef }: BackgroundManagerProps) {
  // Delta Time을 구하기 위한 직전 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 성능을 위한 FPS 제한
  const fps = 10;
  const frameInterval = 1000 / fps; // 렌더링 간격

  // 렌더링 되는 파트
  // 배경화면
  const backgroundFarRef = useRef<BackgroundFarHandle>(null);
  const backgroundNearRef = useRef<BackgroundNearHandle>(null);

  const renderBroadcast = (currentTime: number) => {
    // 캔버스 레퍼런스에서 컨텍스트를 로드하고,
    // 컨텍스트가 로드되지 않았다면 진행하지 않음
    const backgroundContext = backgroundCanvasRef.current?.getContext("2d");
    if (!backgroundContext) return;

    // 이전 프레임 이후 얼마나 시간이 지났는지 계산
    const deltaTime = currentTime - previousTimeRef.current;

    // 프레임 간 시간 차이가 프레임 간격보다 작으면, 렌더링하지 않음
    if (deltaTime < frameInterval) {
      return requestAnimationFrame(renderBroadcast);
    } else {
      previousTimeRef.current = currentTime;
    }

    // 배경화면 렌더링
    backgroundContext.clearRect(0, 0, resolution.width, resolution.height);
    backgroundFarRef.current?.render({
      context: backgroundContext,
      deltaTime: 0,
      xPos: 0,
      yPos: 0,
    });

    backgroundNearRef.current?.render({
      context: backgroundContext,
      deltaTime: 0,
      xPos: 0,
      yPos: 0,
    });

    const context = backgroundCanvasRef.current!.getContext("2d");
    if (!context) return;

    // 다음 프레임에서 렌더링 재요청
    requestAnimationFrame(renderBroadcast);
  };

  useEffect(() => {
    // 캔버스가 로드되지 않았다면 진행하지 않음
    if (!backgroundCanvasRef) return;

    // 렌더링 요청
    let requestAnimationId: number;
    if (backgroundCanvasRef.current) {
      requestAnimationId = requestAnimationFrame(renderBroadcast);

      return () => {
        // 컴포넌트가 사라질 때, 진행되던 렌더링을 취소
        cancelAnimationFrame(requestAnimationId);
      };
    }
  }, [resolution.width, resolution.height, backgroundCanvasRef]);

  return (
    <>
      <BackgroundFar ref={backgroundFarRef} />
      <BackgroundNear ref={backgroundNearRef} />
    </>
  );
}

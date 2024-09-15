"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";
import Canvas from "@canvas";
import { Background } from "@map";
import { floorDeltaTime } from ".";

/** 배경화면 컴포넌트들을 담당하는 매니저 */
export default function BackgroundManager() {
  // 캔버스
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Delta Time을 구하기 위한 직전 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 성능을 위한 FPS 제한
  const fps = 5;
  const frameInterval = 1000 / fps; // 렌더링 간격

  // 렌더링 되는 배경화면들
  const backgroundFar = useRef<Background>();
  const backgroundNear = useRef<Background>();

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

    // 배경화면 렌더링
    context.clearRect(0, 0, resolution.width, resolution.height);
    backgroundFar.current?.render(context);
    backgroundNear.current?.render(context);

    // 다음 프레임에서 렌더링 재요청
    requestAnimationFrame(renderBroadcast);
  };

  useEffect(() => {
    // 캔버스가 로드되지 않았다면 진행하지 않음
    if (!canvasRef) return;

    // 배경화면 로드
    backgroundFar.current = new Background({
      imageName: "background-far",
      xSize: resolution.width,
      ySize: resolution.height,
    });
    backgroundNear.current = new Background({
      imageName: "background-near",
      xSize: resolution.width,
      ySize: resolution.height,
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
  }, [resolution.width, resolution.height, canvasRef]);

  return (
    <>
      <Canvas canvasRef={canvasRef} zIndex={0} />
    </>
  );
}

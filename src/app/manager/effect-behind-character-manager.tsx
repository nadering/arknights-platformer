"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom, cameraAtom } from "@store";
import Canvas from "@canvas";
import { DashEffect, EffectHandle } from "@effects";
import { floorDeltaTime } from ".";

/** 캐릭터 뒤에 렌더링되는 이펙트 컴포넌트들을 담당하는 매니저 */
export default function EffectBehindCharacterManager() {
  // 캔버스
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 이전 프레임이 렌더링된 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 카메라
  const camera = useAtomValue(cameraAtom);
  const cameraXPos = useRef<number>(0);
  const cameraYPos = useRef<number>(0);

  // 렌더링 되는 이펙트들
  const dashEffectRef = useRef<EffectHandle>(null);

  // 렌더링 요청
  const renderBroadcast = (currentTime: number) => {
    // 캔버스 레퍼런스에서 컨텍스트를 로드하고,
    // 컨텍스트가 로드되지 않았다면 진행하지 않음
    const context = canvasRef.current!.getContext("2d");
    if (!context) return;

    // 이전 프레임 이후 얼마나 시간이 지났는지 계산
    const deltaTime = floorDeltaTime(currentTime - previousTimeRef.current);
    previousTimeRef.current = currentTime;

    // 캔버스를 초기화한 후, 렌더링 시작
    context.clearRect(0, 0, resolution.width, resolution.height);

    // 이펙트
    dashEffectRef.current?.render({
      context,
      deltaTime,
      cameraXPos: cameraXPos.current,
      cameraYPos: cameraYPos.current,
    });

    // 다음 프레임에서 렌더링 재요청
    requestAnimationFrame(renderBroadcast);
  };

  useEffect(() => {
    // 캔버스가 로드되지 않았다면 진행하지 않음
    if (!canvasRef) return;

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
  }, [canvasRef]);

  // 카메라 이동을 반영
  useEffect(() => {
    cameraXPos.current = camera.xPos;
    cameraYPos.current = camera.yPos;
  }, [camera]);

  return (
    <>
      <Canvas canvasRef={canvasRef} zIndex={20} />
      <DashEffect ref={dashEffectRef} />
    </>
  );
}

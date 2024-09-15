"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";
import Canvas from "@canvas";
import { Character, CharacterHandle } from "@character";
import { floorDeltaTime } from ".";

/** 캐릭터 컴포넌트를 담당하는 매니저 */
export default function CharacterManager() {
  // 캔버스
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Delta Time을 구하기 위한 직전 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 렌더링 되는 캐릭터
  const characterRef = useRef<CharacterHandle>(null);

  /** 게임 플레이 중 상호작용 가능한 컴포넌트들의 렌더링 요청 메소드로,
   * 매 프레임마다 캔버스를 초기화하고, 순서에 맞게 인스턴스를 렌더링하도록 함
   */
  const renderBroadcast = (currentTime: number) => {
    // 캔버스 레퍼런스에서 컨텍스트를 로드하고,
    // 컨텍스트가 로드되지 않았다면 진행하지 않음
    const context = canvasRef.current!.getContext("2d");
    if (!context) return;

    // 이전 프레임 이후 얼마나 시간이 지났는지 계산
    const deltaTime = floorDeltaTime(currentTime - previousTimeRef.current);
    previousTimeRef.current = currentTime;

    // 캔버스를 초기화한 후, 렌더링 시작
    // 렌더링 순서: 배경화면 > 타일 > 캐릭터 > 이펙트 > UI
    context.clearRect(0, 0, resolution.width, resolution.height);
    characterRef.current?.render({
      context,
      deltaTime,
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

  return (
    <>
      <Canvas canvasRef={canvasRef} zIndex={30} />
      <Character ref={characterRef} />
    </>
  );
}

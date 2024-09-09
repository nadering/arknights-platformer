"use client";

import React, { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { CanvasComponentProps } from "@canvas";
import { resolutionAtom } from "@store";
import { Character, CharacterHandle } from "@character";
import { DashEffect, DashEffectHandle } from "@effects";

/** 인게임 진행을 담당하는 컴포넌트 */
export default function GameManager({ canvasRef }: CanvasComponentProps) {
  // Delta Time을 구하기 위한 직전 시간 및 화면 크기
  const previousTimeRef = useRef<number>(performance.now());
  const resolution = useAtomValue(resolutionAtom);

  // 렌더링 되는 파트
  // 캐릭터
  const characterRef = useRef<CharacterHandle>(null);

  // 이펙트
  const dashEffectRef = useRef<DashEffectHandle>(null);

  /** 전체 컴포넌트의 렌더링 요청 메소드로,
   * 매 프레임마다 1번만 캔버스를 초기화하고, 순서에 맞게 모든 인스턴스를 렌더링하도록 함
   */
  const renderBroadcast = (currentTime: number) => {
    // 캔버스가 로드되지 않았다면 진행하지 않음
    if (!canvasRef.current) return;

    // 캔버스 레퍼런스에서 컨텍스트를 로드하고,
    // 컨텍스트가 로드되지 않았다면 진행하지 않음
    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    // 이전 프레임 이후 얼마나 시간이 지났는지 계산
    const deltaTime = currentTime - previousTimeRef.current;
    previousTimeRef.current = currentTime;

    // 캔버스를 초기화한 후, 렌더링 시작
    context.clearRect(0, 0, resolution.width, resolution.height);

    // 렌더링 순서: 배경화면 > 타일 > 몬스터 > 캐릭터 > 이펙트 > UI
    // 1. 캐릭터
    characterRef.current?.render({
      context,
      deltaTime,
    });

    // 2. 이펙트
    dashEffectRef.current?.render({
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
      <Character ref={characterRef} />
      <DashEffect ref={dashEffectRef} />
    </>
  );
}

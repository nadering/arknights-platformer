"use client";

import { RefObject, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";

/** 캔버스 계열 컴포넌트는, 반드시 이 타입 계열을 Props로 받아야 함 */
export interface CanvasComponentProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  zIndex: number;
}

/** 캔버스에 렌더링되며 움직일 수 있는 컴포넌트는, 반드시 이 타입을 Parameter로 갖는 메소드를 갖고 있어야 함 */
export interface CanvasRenderProps {
  context: CanvasRenderingContext2D;
  deltaTime: number;
}

/** 캔버스에 렌더링되며 외부 컴포넌트에 의해 위치가 결정되는 컴포넌트는, 반드시 이 타입을 Parameter로 갖는 메소드를 갖고 있어야 함 */
export interface CanvasPosRenderProps {
  context: CanvasRenderingContext2D;
  deltaTime: number;
  xPos: number;
  yPos: number;
}

/** 캔버스 컴포넌트 */
export default function Canvas({ canvasRef, zIndex }: CanvasComponentProps) {
  // 화면 비율 고정
  const resolution = useAtomValue(resolutionAtom);
  const [width, setWidth] = useState(resolution.width);
  const [height, setHeight] = useState(resolution.height);

  // DPR 보정
  useEffect(() => {
    if (typeof window !== undefined) {
      const dpr = window.devicePixelRatio;

      setWidth((prev) => prev * dpr);
      setHeight((prev) => prev * dpr);

      if (canvasRef.current) {
        canvasRef.current.getContext("2d")?.scale(dpr, dpr);
      }
    }
  }, [canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ zIndex }}
      className="absolute top-0 left-0"
    />
  );
}

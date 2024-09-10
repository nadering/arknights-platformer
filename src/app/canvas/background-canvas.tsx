"use client";

import { useEffect, useState, RefObject } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";

export interface BackgroundCanvasComponentProps {
  backgroundCanvasRef: RefObject<HTMLCanvasElement>;
}

/** 배경화면 캔버스 컴포넌트 */
export default function BackgroundCanvas({
  backgroundCanvasRef,
}: BackgroundCanvasComponentProps) {
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

      if (backgroundCanvasRef.current) {
        backgroundCanvasRef.current.getContext("2d")?.scale(dpr, dpr);
      }
    }
  }, [backgroundCanvasRef]);

  return (
    <canvas
      ref={backgroundCanvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 z-10"
    />
  );
}

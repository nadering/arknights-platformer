"use client";

import { useRef } from "react";
import { Canvas, BackgroundCanvas } from "@canvas";
import { GameManager, BackgroundManager } from "@manager";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <>
      <GameManager canvasRef={canvasRef} />
      <BackgroundManager backgroundCanvasRef={backgroundCanvasRef} />
      <Canvas canvasRef={canvasRef} />
      <BackgroundCanvas backgroundCanvasRef={backgroundCanvasRef} />
    </>
  );
}

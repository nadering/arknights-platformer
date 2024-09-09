"use client";

import { useRef } from "react";
import { Canvas } from "@canvas";
import { GameManager } from "@manager";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <>
      <Canvas canvasRef={canvasRef} />
      <GameManager canvasRef={canvasRef} />
    </>
  );
}

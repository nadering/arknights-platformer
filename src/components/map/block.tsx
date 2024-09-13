"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";
import { CanvasPosRenderProps } from "@canvas";

/** 블록 컴포넌트에서 사용할 수 있는 변수 및 메소드 선언 */
export interface BlockHandle {
  render: ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => void;
  setSize: ({ x, y }: { x: number; y: number }) => void;
  type: string;
}

// 단일 블록
const Block = forwardRef<BlockHandle>((_, ref) => {
  // 타입
  const type = "Block";

  // 화면 크기
  const resolution = useAtomValue(resolutionAtom);
  const screenWidth = resolution.width;

  // 크기
  const xSize = useRef<number>(screenWidth / 40);
  const ySize = useRef<number>(screenWidth / 40);

  // 프레임 (단일)
  const frameList = useRef<HTMLImageElement[]>([]); // 프리로딩한 이미지

  /*
  // 프레임 (애니메이션)
  const animated = useRef<boolean>(false); // 움직이는 블록 여부
  const frameIndex = useRef<number>(0); // 현재 출력 중인 프레임 인덱스
  const frameCount = 8; // 총 프레임 개수
  const frameDeltaTime = useRef<number>(0); // 출력 시작 후 경과된 시간
  const frameInterval = 30; // 프레임이 넘어가는 간격 (ms)
  */

  useImperativeHandle(ref, () => {
    return {
      render: ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) =>
        render({ context, deltaTime, xPos, yPos }),
      setSize: ({ x, y }: { x: number; y: number }) => setSize({ x, y }),
      type,
    };
  });

  // 움직이는 블록이라면 deltaTime을 사용한 후, ESlint 관련 주석 제거
  // eslint-disable-next-line
  const render = ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => {
    if (frameList.current) {
      context.drawImage(
        frameList.current[0],
        xPos,
        yPos,
        xSize.current,
        ySize.current
      );
    }
  };

  const setSize = ({ x, y }: { x: number; y: number }) => {
    xSize.current = x;
    ySize.current = y;
  };

  // 이미지 프리로딩
  useEffect(() => {
    const imageSrc = "/image/map/terrain_2x2_B.png";
    const image = new Image();
    image.src = imageSrc;
    frameList.current.push(image);
  }, []);

  return <></>;
});

Block.displayName = "Block";
export default Block;

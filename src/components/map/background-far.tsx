"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";
import { CanvasPosRenderProps } from "@canvas";

/** 먼 배경화면 컴포넌트에서 사용할 수 있는 변수 및 메소드 선언 */
export interface BackgroundFarHandle {
  render: ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => void;
}

// 먼 배경화면 컴포넌트
const BackgroundFar = forwardRef<BackgroundFarHandle>((_, ref) => {
  // 타입
  const type = "BackgroundFar";

  // 화면 크기
  const resolution = useAtomValue(resolutionAtom);

  // 크기
  const xSize = resolution.width;
  const ySize = resolution.height;

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
      type,
    };
  });

  /**  배경화면 렌더링 메소드
   * 움직이는 배경 화면이라면 deltaTime을 사용한 후, ESlint 관련 주석 제거
   */
  // eslint-disable-next-line
  const render = ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => {
    if (frameList.current) {
      context.drawImage(frameList.current[0], xPos, yPos, xSize, ySize);
    }
  };

  /** 이미지 프리로딩 */
  useEffect(() => {
    const imageSrc = "/image/map/background-far.webp";
    const image = new Image();
    image.src = imageSrc;
    frameList.current.push(image);
  }, []);

  return <></>;
});

BackgroundFar.displayName = "BackgroundFar";
export default BackgroundFar;

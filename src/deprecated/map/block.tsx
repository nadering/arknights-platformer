"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CanvasPosRenderProps } from "@canvas";

/** 블록 컴포넌트에서 사용할 수 있는 변수 및 메소드 선언 */
export interface BlockHandle {
  render: ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => void;
  setSize: ({ x, y }: { x: number; y: number }) => void;
  setImage: (blockType: number) => void;
  setCollidable: (collidableList: CollidableDirection[]) => void;
  type: string;
}

/** 충돌 가능한 방향 */
type CollidableDirection = "top" | "right" | "bottom" | "left";

// 단일 블록
const Block = forwardRef<BlockHandle>((_, ref) => {
  // 타입
  const type = "Block";

  // 크기
  const xSize = useRef<number>(0);
  const ySize = useRef<number>(0);

  // 충돌 가능 방향
  const collidable = useRef<CollidableDirection[]>([]);

  // 프레임 (단일)
  const currentFrame = useRef<HTMLImageElement>(); // 현재 프레임
  const frameLoaded = useRef<HTMLImageElement[]>([]); // 프리로딩한 프레임

  useImperativeHandle(ref, () => {
    return {
      render: ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) =>
        render({ context, deltaTime, xPos, yPos }),
      setSize: ({ x, y }: { x: number; y: number }) => setSize({ x, y }),
      setImage: (blockType: number) => setImage(blockType),
      setCollidable: (collidableList: CollidableDirection[]) =>
        setCollidable(collidableList),
      type,
    };
  });

  // 움직이는 블록이라면 deltaTime을 사용한 후, ESlint 관련 주석 제거
  // eslint-disable-next-line
  const render = ({ context, deltaTime, xPos, yPos }: CanvasPosRenderProps) => {
    if (currentFrame.current) {
      context.drawImage(
        currentFrame.current,
        xPos,
        yPos,
        xSize.current,
        ySize.current
      );
    }
  };

  /** 블록 크기 설정 */
  const setSize = ({ x, y }: { x: number; y: number }) => {
    xSize.current = x;
    ySize.current = y;
  };

  /** 블록 이미지 설정 */
  const setImage = (blockType: number) => {
    if (blockType < frameLoaded.current.length) {
      currentFrame.current = frameLoaded.current[blockType];
    }
  };

  /** 블록의 충돌 가능한 방향 설정 */
  const setCollidable = (collidableList: CollidableDirection[]) => {
    collidable.current = collidableList;
  };

  // 이미지 프리로딩
  useEffect(() => {
    const blockTypeCount = 4;
    for (let i = 0; i < blockTypeCount; i++) {
      const imageSrc = `/image/map/block/block-${i}.png`;
      const image = new Image();
      image.src = imageSrc;
      frameLoaded.current.push(image);
    }
    currentFrame.current = frameLoaded.current[0];
  }, []);

  return <></>;
});

Block.displayName = "Block";
export default Block;

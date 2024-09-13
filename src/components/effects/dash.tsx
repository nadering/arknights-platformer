"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useAtom } from "jotai";
import { dashEffectAtom } from "@store";
import { CanvasRenderProps } from "@canvas";

/** 이펙트 컴포넌트에서 사용할 수 있는 변수 및 메소드 선언 */
export interface EffectHandle {
  render: ({ context, deltaTime }: CanvasRenderProps) => void;
  type: string;
}

// 캐릭터 대시 이펙트
const DashEffect = forwardRef<EffectHandle>((_, ref) => {
  // 타입
  const type = "Effect";

  // 이펙트 출력에 필요한 정보를 담고 있는 아톰 (출력 여부, 캐릭터 위치, 각도 등)
  const [setting, setSetting] = useAtom(dashEffectAtom);

  // 프레임 (애니메이션)
  const frameDeltaTime = useRef<number>(0); // 렌더링 시작 후 경과된 시간
  const frameIndex = useRef<number>(0); // 현재 렌더링하고 있는 잔상 개수

  useImperativeHandle(ref, () => {
    return {
      render: ({ context, deltaTime }: CanvasRenderProps) =>
        render({ context, deltaTime }),
      type,
    };
  });

  /** 대시 이펙트 렌더링 메소드 */
  const render = ({ context, deltaTime }: CanvasRenderProps) => {
    // 대시하지 않은 상태면 이펙트를 렌더링하지 않음
    if (!setting.active) return;

    // 모든 이펙트를 재생했다면 렌더링을 종료함
    let effectEnded: boolean = true;
    for (let i = 0; i < setting.afterImageList.length; i++) {
      if (setting.afterImageList[i].displayCount > 0) {
        effectEnded = false;
      }
    }
    if (effectEnded) {
      setSetting((prev) => {
        return { ...prev, active: false, afterImageList: [] };
      });
      return;
    }

    // 일정 시간이 지날 때마다, 현재 있는 잔상들의 렌더링 가능 횟수를 감소시킴
    frameDeltaTime.current += deltaTime;
    if (frameDeltaTime.current > setting.interval) {
      frameDeltaTime.current -= setting.interval;

      setting.afterImageList.forEach(
        (afterImage) => (afterImage.displayCount -= 1)
      );
    }

    // 잔상 렌더링 부분
    // 잔상이 캐릭터에 너무 가까이 붙는 걸 방지하기 위해, 가장 최근에 생긴 잔상 일부를 렌더링 하지 않음
    const skipAfterImage = 1;
    for (let i = 0; i < setting.afterImageList.length - skipAfterImage; i++) {
      // 잔상 데이터를 얻어온 후, 재생 가능한 잔상 각각을 렌더링함
      const afterImage = setting.afterImageList[i];

      if (afterImage.displayCount > 0) {
        // 렌더링 가능한 잔상이라면, 현재까지 렌더링된 횟수에 비례해서 투명도 조절
        context.globalAlpha =
          afterImage.displayCount / (setting.effectCount * 2);

        // 렌더링된 횟수에 비례해서 잔상의 위치 및 사이즈 조절
        const sizeShirinker =
          0.5 + (afterImage.displayCount - 1) / setting.effectCount;

        const modifiedXPos =
          afterImage.xPos + (1 - sizeShirinker) * 0.5 * afterImage.xSize;
        const modifiedYPos =
          afterImage.yPos + (1 - sizeShirinker) * 0.5 * afterImage.ySize;

        const modifiedXSize = afterImage.xSize * sizeShirinker;
        const modifiedYSize = afterImage.ySize * sizeShirinker;

        // 잔상을 그린 후
        context.beginPath();
        context.fillStyle = "blue";
        context.strokeRect(
          Math.floor(modifiedXPos),
          Math.floor(modifiedYPos),
          modifiedXSize,
          modifiedYSize
        );
        context.fillRect(
          Math.floor(modifiedXPos),
          Math.floor(modifiedYPos),
          modifiedXSize,
          modifiedYSize
        );
        context.closePath();

        // 투명도를 다시 원래대로 되돌림
        context.globalAlpha = 1;
      }
    }
  };

  /** 대시하면 아톰에서 정보를 받아와 렌더링 과정 초기화 */
  useEffect(() => {
    if (setting.active) {
      frameIndex.current = 0;
      frameDeltaTime.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setting]);

  return <></>;
});

DashEffect.displayName = "DashEffect";
export default DashEffect;

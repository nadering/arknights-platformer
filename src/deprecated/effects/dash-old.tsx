// "use client";

// import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
// import { useAtom } from "jotai";
// import { dashOldEffectAtom } from "@store";
// import { CanvasRenderProps } from "@canvas";
// import { EffectHandle } from "@effects";

// // 캐릭터 대시 이펙트 (Deprecated)
// const DashOldEffect = forwardRef<EffectHandle>((_, ref) => {
//   // 타입
//   const type = "Effect";

//   // 크기
//   const sizeScale = 0.46;
//   const xSize = 94 * sizeScale;
//   const ySize = 56 * sizeScale;

//   // 프레임 (애니메이션)
//   const frameList = useRef<HTMLImageElement[]>([]); // 프리로딩한 이미지
//   const frameIndex = useRef<number>(0); // 현재 출력 중인 프레임 인덱스
//   const frameCount = 8; // 총 프레임 개수
//   const frameDeltaTime = useRef<number>(0); // 출력 시작 후 경과된 시간
//   const frameInterval = 35; // 프레임이 넘어가는 간격 (ms)

//   // 이펙트 출력에 필요한 정보를 담고 있는 아톰 (출력 여부, 캐릭터 위치, 각도 등)
//   const [dashEffectSetting, setDashEffectSetting] = useAtom(dashOldEffectAtom);

//   useImperativeHandle(ref, () => {
//     return {
//       render: ({ context, deltaTime }: CanvasRenderProps) =>
//         render({ context, deltaTime }),
//       type,
//     };
//   });

//   const render = ({ context, deltaTime }: CanvasRenderProps) => {
//     // 대시하지 않은 상태면 이펙트를 렌더링하지 않음
//     if (!dashEffectSetting.active) return;

//     // 프레임 (애니메이션)
//     // 일정 시간이 지날 때마다 다음 프레임으로 넘어감
//     frameDeltaTime.current += deltaTime;
//     if (frameDeltaTime.current > frameInterval) {
//       frameDeltaTime.current -= frameInterval;

//       // 이펙트 재생이 끝나면, 더 이상 이펙트를 렌더링하지 않음
//       if (frameIndex.current + 1 == frameCount) {
//         setDashEffectSetting((prev) => {
//           return { ...prev, active: false };
//         });
//       } else {
//         frameIndex.current = (frameIndex.current + 1) % frameCount;
//       }
//     }

//     // 위치 설정
//     const xPos = dashEffectSetting.xPos - xSize / 2;
//     const yPos = dashEffectSetting.yPos - ySize / 2;

//     // 캔버스의 중심을 이펙트의 가운데로 바꾸고 회전시킨 후, 캔버스의 중심을 원래대로 되돌린 후에
//     context.translate(xPos + xSize / 2, yPos + ySize / 2);
//     context.rotate((dashEffectSetting.degree * Math.PI) / 180);
//     context.translate(-(xPos + xSize / 2), -(yPos + ySize / 2));

//     // 지정된 위치에 이펙트를 그리고,
//     context.drawImage(
//       frameList.current[frameIndex.current],
//       Math.floor(xPos),
//       Math.floor(yPos),
//       xSize,
//       ySize
//     );

//     // 캔버스의 회전을 되돌림
//     context.translate(xPos + xSize / 2, yPos + ySize / 2);
//     context.rotate(-(dashEffectSetting.degree * Math.PI) / 180);
//     context.translate(-(xPos + xSize / 2), -(yPos + ySize / 2));
//   };

//   // 이미지 프리로딩
//   useEffect(() => {
//     for (let i = 0; i < frameCount; i++) {
//       const imageSrc = `/image/effects/dash-old/${i}.png`;
//       const image = new Image();
//       image.src = imageSrc;
//       frameList.current.push(image);
//     }
//   }, []);

//   // 대쉬하면 정보를 받아와 애니메이션 초기화
//   useEffect(() => {
//     if (dashEffectSetting.active) {
//       frameIndex.current = 0;
//       frameDeltaTime.current = 0;
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dashEffectSetting]);

//   return <></>;
// });

// DashOldEffect.displayName = "DashOldEffect";
// export default DashOldEffect;

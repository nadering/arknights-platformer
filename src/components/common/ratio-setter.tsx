"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { resolutionAtom } from "@store";

interface RatioSetterProps {
  children: React.ReactNode;
}

/** 화면 비율을 고정해주는 컴포넌트 */
export default function RatioSetter({ children }: RatioSetterProps) {
  const resolution = useAtomValue(resolutionAtom);

  const [width, setWidth] = useState(resolution.width);
  const [height, setHeight] = useState(resolution.height);
  const [zoom, setZoom] = useState(1);

  const resizeEventListener = () => {
    // 화면 비율 고정
    const setFrameSize = () => {
      // 브라우저의 현재 사이즈
      // 스크롤바를 제거해둔 상태기 때문에, window.innerWidth 계열을 사용해도 무방함
      // 참고 사항: window.innerWidth는 스크롤바까지 포함되며, root.clientWidth는 스크롤바가 포함되지 않음
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 해상도 및 브라우저의 가로 크기에 따라, 세로 크기를 결정
      const targetHeight = windowWidth * (resolution.height / resolution.width);

      // 원하는 화면 비율을 유지할 수 있도록 Width, Height를 고정
      setWidth(resolution.width);
      setHeight(resolution.height);

      // 그 후 Zoom을 통해 화면 비율을 고정하고 사이즈를 조절
      // 브라우저 가로 길이가 너무 길어, 결정된 세로 크기가 너무 길다면 세로를 기준으로 조절
      if (targetHeight > windowHeight) {
        setZoom(windowHeight / resolution.height);
      } else {
        setZoom(windowWidth / resolution.width);
      }
    };

    return () => {
      setFrameSize();
    };
  };

  // 컴포넌트가 마운트될 때 화면 비율을 고정하는 이벤트 리스너를 등록
  useEffect(() => {
    const FixRatio = resizeEventListener();

    if (typeof window !== undefined) {
      window.addEventListener("resize", FixRatio);
    }
    FixRatio();

    return () => {
      window.removeEventListener("resize", FixRatio);
    };
  });

  return (
    <div className="flex justify-center items-center w-screen h-screen bg-black">
      <div className="relative" style={{ width, height, zoom }}>
        {children}
      </div>
    </div>
  );
}

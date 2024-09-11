"use client";

import {
  forwardRef,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { resolutionAtom, dashEffectAtom, degree, keyboardSettingAtom } from "@store";
import { CanvasRenderProps } from "@canvas";
import { useAudio } from "@hooks";

/** 입력받은 키의 타입 */
interface Keys {
  [key: string]: {
    startTime: number;
  };
}

/** 속도 타입 */
interface SpeedProps {
  x: number;
  y: number;
}

/** 캐릭터 컴포넌트에서 사용할 수 있는 변수 및 메소드 선언 */
export interface CharacterHandle {
  render: ({ context, deltaTime }: CanvasRenderProps) => void;
  type: string;
  xSize: MutableRefObject<number>;
  ySize: MutableRefObject<number>;
  xPos: MutableRefObject<number>;
  yPos: MutableRefObject<number>;
}

const Character = forwardRef<CharacterHandle>((_, ref) => {
  // 타입
  const type = "Character";

  // 화면 크기
  const resolution = useAtomValue(resolutionAtom);
  const screenWidth = resolution.width;
  const screenHeight = resolution.height;

  // 컴포넌트 크기
  const xSize = useRef<number>(16);
  const ySize = useRef<number>(22);

  // 위치
  const xPos = useRef<number>(0);
  const yPos = useRef<number>(screenHeight - ySize.current);

  // 속도
  const speed = useRef<SpeedProps>({
    x: 0,
    y: 0,
  });

  /* 
  // 프레임 (애니메이션)
  const frameIndex = useRef<number>(0);
  const frameCount = useRef<number>(6);
  const frameInterval = useRef<number>(80);
  const frameDeltaTime = useRef<number>(0);
  */

  // 키보드 설정
  const keyboardSetting = useAtomValue(keyboardSettingAtom)

  // X축 속도 관련
  const xSpeedAccel = useRef<number>(0.012); // 가속도
  const xSpeedAccelMidAir = xSpeedAccel.current * 0.65; // 공중에서의 가속도
  const xSpeedMaximum = xSpeedAccel.current * 100; // X축 기준 일반 이동 시 최고 속도
  const xJumpForce = xSpeedAccel.current * 35; // 점프 시, 조작감을 위해 추가로 X축에 가해지는 힘

  // Y축 속도 및 점프 관련
  const midAir = useRef<boolean>(false); // 공중에 있는지 여부
  const ySpeedForce = useRef<number>(2.2); // 점프에 Y축으로 가하는 힘
  const gravity = useRef<number>(0.01); // 중력 가속도
  const ySpeedMaximum = gravity.current * 400; // Y축 기준, 낙하 시 최고 속도

  // 점프 관련 - 높은 점프 (혹은 풀 점프)
  const lastJumpedTime = useRef<number>(0); // 높은 점프 구현 - 마지막으로 점프한 시간
  const longJumpGravityRatio = 0.5; // 높은 점프 구현 - 중력 감소 비율 (높을수록 점프 최대 높이가 증가)

  // 점프 관련 - 키다운/키업 설정
  const setJumpNeedKeyUp = useRef<boolean>(false); // 점프 후 다시 점프하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isJumpKeyUp = useRef<boolean>(true); // 점프 후 점프 키가 떼졌는지 여부

  /*
  // 점프 관련 - 코요테 점프 (공중이어도 코요테 시간 내로는 점프 가능)
  const coyoteJumpTime = useRef<number>(0.08 * 1000); // 코요테 점프  - 허용 시간
  const coyoteJumpTimeLeft = useRef<number>(0); // 코요테 점프 - 남은 시간 (0 이상일 때 코요테 점프 가능)
  */

  // 점프 관련 - 웨이브 대시 (공중에서 낙하 중에 하단 방향으로 대시한 후, 대시 시전 시간 내로 지면에서 점프)
  const setWaveDashNeedDrop = useRef<boolean>(true); // 웨이브 대시를 하려면, 대시 전에 캐릭터가 아래로 떨어지고 있어야 하는지 여부
  const ySpeedBeforeDash = useRef<number>(0); // 대시 전 Y축 속도
  const waveDashYForce = 0.4; // 점프 시 Y축 높이가 낮아지도록 보정
  const waveDashXForce = 2.5; // 점프 시 X축 속도가 증가하도록 보정

  // 대시 관련
  const dashSpeedForce = useRef<number>(2.05); // 대시에 가하는 힘
  const yDashSpeedForceEdit = useRef<number>(1); // 대시 중 Y축 높이 보정 (높을수록 더 높게 상승)
  const canDashWithMidAir = useRef<boolean>(true); // 대시할 수 있는지 여부로, 점프로 공중에 올라가면 midAir = true지만 이 변수는 false 상태를 유지함

  // 대시 관련 - 대시 시전 시간
  const dashCastingTime = useRef<number>(0.18 * 1000); // 시전에 걸리는 총 시간
  const dashCastingTimeLeft = useRef<number>(0); // 남은 시간 (0 초과면 대시 중이며, 대시 사용 불가)

  // 대시 관련 - 대시 재사용 대기시간
  const dashCooldown = useRef<number>(0.5 * 1000); // 재사용 대기시간 수치
  const dashCooldownLeft = useRef<number>(0); // 남은 시간 (0 초과면 사용 불가)

  // 대시 관련 - 키다운/키업 설정
  const setDashNeedKeyUp = useRef<boolean>(true); // 대시 후 다시 대시하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isDashKeyUp = useRef<boolean>(true); // 대시 후 대시 키가 떼졌는지 여부

  // 입력된 키
  const keys = useRef<Keys>({});

  // 이펙트 관련
  const setDashEffect = useSetAtom(dashEffectAtom); // 대시 이펙트

  // 사운드 관련
  const { audioLoaded, audios } = useAudio({
    dash: { sourceUrl: "/audio/effects/dash.mp3", volume: 0.4 },
  });

  /** 부모 컴포넌트에서 사용할 값들 선언 */
  useImperativeHandle(ref, () => {
    return {
      // 렌더링 메소드
      render: ({ context, deltaTime }: CanvasRenderProps) =>
        render({ context, deltaTime }),
      // 타입
      type,
      // 크기
      xSize,
      ySize,
      // 위치
      xPos,
      yPos,
    };
  });

  /** 캐릭터 렌더링 메소드 */
  const render = ({ context, deltaTime }: CanvasRenderProps) => {
    // 대시 설정
    setDash(deltaTime);

    // X축 및 Y축 속도 설정
    setXSpeed(deltaTime);
    setYSpeed(deltaTime);

    // 위치 변경
    setXPos();
    setYPos();

    // 렌더링하는 부분
    // 사각형
    context.beginPath();
    context.fillStyle = "green";
    context.strokeRect(
      Math.floor(xPos.current),
      Math.floor(yPos.current),
      xSize.current,
      ySize.current
    );
    context.fillRect(
      Math.floor(xPos.current),
      Math.floor(yPos.current),
      xSize.current,
      ySize.current
    );
    context.closePath();

    /*
    // 캐릭터 이미지
    frameDeltaTime.current += deltaTime;
    if (frameDeltaTime.current > frameInterval.current) {
      frameDeltaTime.current -= frameInterval.current;
      frameIndex.current = (frameIndex.current + 1) % frameCount.current;
    }
    */
  };

  /** 캐릭터의 X축 속도를 관리 */
  const setXSpeed = (deltaTime: number) => {
    // 대시 시전 시간 중에는 방향키를 통해 이동 속도를 조절할 수 없음
    if (dashCastingTimeLeft.current > 0) {
      return;
    }

    // 방향키 입력 여부
    let moved: boolean = false;

    if (keys.current.hasOwnProperty(keyboardSetting.right)) {
      // 오른쪽 이동
      moved = true;
      if (!midAir.current) {
        // 지면
        if (speed.current.x >= xSpeedMaximum) {
          // 최고 속도 이상 (속도가 점차 감소)
          speed.current.x -= xSpeedAccel.current * 0.4 * deltaTime;
          if (speed.current.x < xSpeedMaximum) speed.current.x = xSpeedMaximum;
        } else {
          // 최고 속도 미만 (속도가 증가)
          speed.current.x += xSpeedAccel.current * deltaTime;
          if (speed.current.x > xSpeedMaximum) speed.current.x = xSpeedMaximum;
        }
      } else {
        // 공중 (속도 증감량이 상대적으로 적음)
        if (speed.current.x >= xSpeedMaximum) {
          // 최고 속도 이상
          speed.current.x -= xSpeedAccelMidAir * 0.4 * deltaTime;
          if (speed.current.x < xSpeedMaximum) speed.current.x = xSpeedMaximum;
        } else {
          // 최고 속도 미만
          speed.current.x += xSpeedAccelMidAir * deltaTime;
          if (speed.current.x > xSpeedMaximum) speed.current.x = xSpeedMaximum;
        }
      }
    }

    if (keys.current.hasOwnProperty(keyboardSetting.left)) {
      // 왼쪽 이동
      moved = true;
      if (!midAir.current) {
        // 지면
        if (-speed.current.x >= xSpeedMaximum) {
          // 최고 속도 이상
          speed.current.x += xSpeedAccel.current * 0.4 * deltaTime;
          if (-speed.current.x < xSpeedMaximum)
            speed.current.x = -xSpeedMaximum;
        } else {
          // 최고 속도 미만
          speed.current.x -= xSpeedAccel.current * deltaTime;
          if (-speed.current.x > xSpeedMaximum)
            speed.current.x = -xSpeedMaximum;
        }
      } else {
        // 공중 (속도 증감량이 상대적으로 적음)
        if (-speed.current.x >= xSpeedMaximum) {
          // 최고 속도 이상
          speed.current.x += xSpeedAccelMidAir * 0.4 * deltaTime;
          if (-speed.current.x < xSpeedMaximum)
            speed.current.x = -xSpeedMaximum;
        } else {
          // 최고 속도 미만
          speed.current.x -= xSpeedAccelMidAir * deltaTime;
          if (-speed.current.x > xSpeedMaximum)
            speed.current.x = -xSpeedMaximum;
        }
      }
    }

    if (!moved) {
      // 이동하라는 입력이 없다면 원래 속도로 돌아감
      if (speed.current.x < 0) {
        // 왼쪽으로 이동하고 있던 상태면,
        // 아무런 키 입력이 없을 때는 최고 속도 미만에서 오른쪽으로 이동하는 것과 동일하게 작동
        if (!midAir.current) {
          speed.current.x += xSpeedAccel.current * deltaTime;
        } else {
          speed.current.x += xSpeedAccelMidAir * deltaTime;
        }
        if (speed.current.x > 0) speed.current.x = 0;
      } else {
        // 반대로도 마찬가지로 작동
        if (!midAir.current) {
          speed.current.x -= xSpeedAccel.current * deltaTime;
        } else {
          speed.current.x -= xSpeedAccelMidAir * deltaTime;
        }
        if (speed.current.x < 0) speed.current.x = 0;
      }
    }
  };

  /** 캐릭터의 X축 위치 및 충돌을 관리 */
  const setXPos = () => {
    xPos.current += Math.round(speed.current.x * 100) / 100;

    // X축 기준 양쪽 벽에 닿으면 이동 불가
    if (xPos.current + xSize.current > screenWidth) {
      speed.current.x = 0;
      xPos.current = screenWidth - xSize.current;
    } else if (xPos.current < 0) {
      speed.current.x = 0;
      xPos.current = 0;
    }
  };

  /** 캐릭터의 Y축 이동 및 점프를 관리 */
  const setYSpeed = (deltaTime: number) => {
    if (keys.current.hasOwnProperty(keyboardSetting.jump)) {
      // 점프의 시작은 공중에 떠있지 않아야만 가능
      if (
        !midAir.current &&
        (!setJumpNeedKeyUp.current || isJumpKeyUp.current)
      ) {
        // 점프 시 공중에 뜸
        midAir.current = true;

        if (dashCastingTimeLeft.current > 0) {
          // 웨이브 대시
          // 공중에서 낙하 중에 지면으로 대시한 후, 대시 시전 시간 내로 지면에서 점프할 때 점프 높이가 낮아지고 X축 속도가 증가하도록 보정
          // 지면에서 대시한 후 점프할 때는 대시의 시전 시간이 짧아지므로 상관 없음

          if (!setWaveDashNeedDrop.current || ySpeedBeforeDash.current > 0) {
            // 점프 높이를 낮춤
            speed.current.y -= ySpeedForce.current * waveDashYForce;

            if (
              speed.current.x > 0 ||
              keys.current.hasOwnProperty(keyboardSetting.right)
            ) {
              // 우측 방향으로 이동 중인 경우
              speed.current.x += xJumpForce * waveDashXForce;
            } else if (
              speed.current.x < 0 ||
              keys.current.hasOwnProperty(keyboardSetting.left)
            ) {
              // 좌측 방향으로 이동 중인 경우
              speed.current.x -= xJumpForce * waveDashXForce;
            }
          } else {
            // 위로 올라가던 중이라 웨이브 대시가 실패하면, 대시를 즉시 종료
            dashCastingTimeLeft.current = 0;
          }
        } else {
          // 웨이브 대시가 아니면 일반적인 점프
          speed.current.y -= ySpeedForce.current;
        }

        // 높은 점프를 위해 추가
        lastJumpedTime.current = performance.now();

        // 점프 키를 꾹 누르고 있으면 연속으로 나가는 경우 방지
        isJumpKeyUp.current = false;

        // 좌우 방향키가 눌린 상태면, 해당 방향으로 약간 가속을 줌
        if (keys.current.hasOwnProperty(keyboardSetting.right)) {
          speed.current.x += xJumpForce;
        } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
          speed.current.x -= xJumpForce;
        }
      } else if (
        midAir.current &&
        dashCastingTimeLeft.current <= 0 &&
        canDashWithMidAir.current &&
        0.1 * 1000 < performance.now() - lastJumpedTime.current &&
        performance.now() - lastJumpedTime.current < 0.3 * 1000
      ) {
        // 키보드를 꾹 누르고 있으면 높은 점프 (혹은 풀 점프) 판정
        speed.current.y -= gravity.current * longJumpGravityRatio * deltaTime;
      }
    }

    if (midAir.current && dashCastingTimeLeft.current <= 0) {
      // 공중에 떠있으면 중력의 영향을 받아 떨어짐
      // 단, 대시 중에는 영향을 받지 않음
      speed.current.y += gravity.current * deltaTime;
      if (speed.current.y > ySpeedMaximum) {
        speed.current.y = ySpeedMaximum;
      }

      /*
      // 아래 키 입력 시 중력 강화 (임시 비활성화)
      if (keys.current.hasOwnProperty(downMoveKey.current)) {
        // 아래 키를 누르고 있으면 중력의 영향을 더 크게 받음
        speed.current.y += gravity.current * 1.5 * deltaTime;
        if (speed.current.y > ySpeedMaximum * 1.5) {
          speed.current.y = ySpeedMaximum * 1.5;
        }
      } else {
        speed.current.y += gravity.current * deltaTime;
        if (speed.current.y > ySpeedMaximum) {
          speed.current.y = ySpeedMaximum;
        }
      }
      */
    }
  };

  /** 캐릭터의 Y축 위치 및 충돌을 관리 */
  const setYPos = () => {
    yPos.current += Math.round(speed.current.y * 100) / 100;

    // Y축 기준 공중에 있다가 바닥에 닿으면 다시 점프 및 대시 가능
    if (midAir.current && yPos.current + ySize.current > screenHeight) {
      speed.current.y = 0;
      yPos.current = screenHeight - ySize.current;

      midAir.current = false;
      canDashWithMidAir.current = true;
    }
  };

  /** 캐릭터의 대시 속도 및 재사용 대기시간과 시전 시간을 관리 */
  const setDash = (deltaTime: number) => {
    // 시전 시간 및 재사용 대기시간 감소
    if (dashCastingTimeLeft.current > 0) {
      dashCastingTimeLeft.current -= deltaTime;
    }
    if (dashCooldownLeft.current > 0) {
      dashCooldownLeft.current -= deltaTime;
    }

    if (
      keys.current.hasOwnProperty(keyboardSetting.dash) &&
      (!setDashNeedKeyUp.current || isDashKeyUp.current) &&
      dashCastingTimeLeft.current <= 0 &&
      dashCooldownLeft.current <= 0 &&
      canDashWithMidAir.current
    ) {
      // 1, 2) 대시 키가 눌렸고, 3) 대시 시전 중이 아니고,
      // 4) 대시 재사용 대기시간이 끝났으며, 5) 공중에서 이미 대시를 하지 않은 경우라면 대시
      if (keys.current.hasOwnProperty(keyboardSetting.up)) {
        if (keys.current.hasOwnProperty(keyboardSetting.right)) {
          // 우측 상단으로 대시
          setDashOption(45);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          const newXSpeed = dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed > newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              -dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current,
          };
        } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 좌측 상단으로 대시
          setDashOption(315);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          const newXSpeed = -dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed < newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              -dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current,
          };
        } else {
          // 상단으로 대시
          setDashOption(0);

          speed.current = {
            x: 0,
            y: -dashSpeedForce.current * yDashSpeedForceEdit.current * 0.9,
          };
        }
      } else if (
        keys.current.hasOwnProperty(keyboardSetting.down) &&
        midAir.current
      ) {
        if (keys.current.hasOwnProperty(keyboardSetting.right)) {
          // (공중에 있으면) 우측 하단으로 대시
          setDashOption(135);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          const newXSpeed = dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed > newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current,
          };
        } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
          // (공중에 있으면) 좌측 하단으로 대시
          setDashOption(225);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          const newXSpeed = -dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed < newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current,
          };
        } else if (!keys.current.hasOwnProperty(keyboardSetting.up)) {
          // (공중에 있으면) 하단으로 대시
          setDashOption(180);

          speed.current = {
            x: 0,
            y: dashSpeedForce.current * yDashSpeedForceEdit.current,
          };
        }
      } else if (keys.current.hasOwnProperty(keyboardSetting.right)) {
        if (!keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 우측으로 대시
          setDashOption(90, true);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          speed.current = {
            x:
              beforeXSpeed > dashSpeedForce.current
                ? beforeXSpeed
                : dashSpeedForce.current,
            y: 0,
          };
        }
      } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
        if (!keys.current.hasOwnProperty(keyboardSetting.right)) {
          // 좌측으로 대시
          setDashOption(270, true);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          speed.current = {
            x:
              beforeXSpeed < -dashSpeedForce.current
                ? beforeXSpeed
                : -dashSpeedForce.current,
            y: 0,
          };
        }
      }
    }
  };

  /** 대시 과정에서 실행되며, 대시 관련 설정을 관리 */
  const setDashOption = (degree: degree, toMidAir: boolean = false) => {
    // 대시하면 쿨다운 동안 다시 사용 불가능함
    dashCooldownLeft.current = dashCooldown.current;

    // 지면에서 좌우로 대시하면, 시전 시간을 짧게 설정하여 지면 대시 후 점프를 더 수월하게 조정
    if (!midAir.current && toMidAir) {
      dashCastingTimeLeft.current = dashCastingTime.current * 0.01;
    } else {
      dashCastingTimeLeft.current = dashCastingTime.current;
    }

    // 대시 중에는 공중에 뜬 판정이며, 공중에 떠있는 동안 다시 사용 불가능함
    midAir.current = true;
    canDashWithMidAir.current = false;

    // 웨이브 대시 구현을 위해 대시 전 Y축 속도를 저장 (Y축 속도가 양수, 즉 떨어지고 있을 때만 가능)
    ySpeedBeforeDash.current = speed.current.y;

    // 대시 키를 꾹 누르고 있으면 연속으로 나가는 경우 방지
    isDashKeyUp.current = false;

    // 대시 이펙트 활성화
    setDashEffect({
      active: true,
      degree,
      xPos: xPos.current + xSize.current / 2,
      yPos: yPos.current + ySize.current / 2,
    });

    // 대시 사운드 재생
    if (audioLoaded) {
      audios.get("dash")?.();
    }
  };

  // 키보드 이벤트 리스너를 추가
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (ev) => {
        // 키보드가 입력되면 해당 키를 추가
        const key = ev.key === " " ? "Space" : ev.key;
        keys.current = {
          ...keys.current,
          [key]: { startTime: Date.now() },
        };
      });
      window.addEventListener("keyup", (ev) => {
        // 키보드 입력이 끝나면 해당 키를 제거
        const key = ev.key === " " ? "Space" : ev.key;
        delete keys.current[key];

        // 키를 꾹 누르고 있으면 연속으로 동작하는 경우를 방지하는 기능 구현
        switch (key) {
          case keyboardSetting.jump:
            isJumpKeyUp.current = true;
            break;
          case keyboardSetting.dash:
            isDashKeyUp.current = true;
            break;
        }
      });
    }
  }, []);

  return <></>;
});

Character.displayName = "Character";
export default Character;

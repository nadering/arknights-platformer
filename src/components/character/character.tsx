"use client";

import {
  forwardRef,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  resolutionAtom,
  dashEffectAtom,
  degree,
  keyboardSettingAtom,
} from "@store";
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

/** 캐릭터 상태 */
type CharacterStatus =
  | "idle"
  | "walk"
  | "dash"
  | "midair-up"
  | "midair-down"
  | "down"
  | "wall-climb";
type CharacterView = "left" | "right";

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

  // 상태 및 보는 방향
  const status = useRef<CharacterStatus>("idle");
  const view = useRef<CharacterView>("right");

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
  const keyboardSetting = useAtomValue(keyboardSettingAtom);

  // X축 속도 관련
  const xSpeedAccel = useRef<number>(0.012); // 가속도
  const xSpeedAccelMidAir = xSpeedAccel.current * 0.65; // 공중에서의 가속도
  const xSpeedMaximum = xSpeedAccel.current * 80; // X축 기준 일반 이동 시 최고 속도
  const xJumpForce = xSpeedAccel.current * 28; // 점프 시, 조작감을 위해 추가로 X축에 가해지는 힘

  // Y축 속도 및 점프 관련
  const midAir = useRef<boolean>(false); // 공중에 있는지 여부
  const ySpeedForce = useRef<number>(2); // 점프에 Y축으로 가하는 힘
  const gravity = useRef<number>(0.012); // 중력 가속도
  const ySpeedMaximum = gravity.current * 400; // Y축 기준, 낙하 시 최고 속도

  // 점프 관련 - 높은 점프 (혹은 풀 점프)
  const lastJumpedTime = useRef<number>(0); // 높은 점프 구현 - 마지막으로 점프한 시간
  const longJumpGravityRatio = 0.65; // 높은 점프 구현 - 중력 감소 비율 (높을수록 점프 최대 높이가 증가)

  // 점프 관련 - 키다운/키업 설정
  const setJumpNeedKeyUp = useRef<boolean>(true); // 점프 후 다시 점프하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isJumpKeyUp = useRef<boolean>(true); // 점프 후 점프 키가 떼졌는지 여부

  // 점프 관련 - 코요테 점프 (공중이어도 코요테 시간 내로는 점프 가능)
  const coyoteJumpTime = useRef<number>(0.08 * 1000); // 코요테 점프 - 허용 시간
  const coyoteJumpTimeLeft = useRef<number>(0); // 코요테 점프 - 남은 시간 (0 이상일 때 코요테 점프 가능)

  // 대시 관련
  const dashSpeedForce = useRef<number>(2.1); // 대시에 가하는 힘
  const yDashSpeedForceEdit = useRef<number>(1); // 대시 중 Y축 높이 보정 (높을수록 더 높게 상승)

  // 대시 관련 - 대시 사용 가능 횟수
  const dashAbleCount = useRef<number>(1);
  const dashAbleCountLeft = useRef<number>(dashAbleCount.current);

  // 대시 관련 - 대시 시전 시간
  const dashCastingTime = useRef<number>(0.17 * 1000); // 시전에 걸리는 총 시간
  const dashCastingTimeLeft = useRef<number>(0); // 남은 시간 (0 초과면 대시 중이며, 대시 사용 불가)

  // 대시 관련 - 대시 재사용 대기시간
  const dashCooldown = useRef<number>(0.23 * 1000); // 재사용 대기시간 수치
  const dashCooldownLeft = useRef<number>(0); // 남은 시간 (0 초과면 사용 불가)

  // 대시 관련 - 대시 충전 불가 시간
  const dashChargeNeedTime = useRef<number>(0.05 * 1000); // 지면에 닿아도 대시의 충전이 불가능한 시간
  const dashChargeNeedTimeLeft = useRef<number>(0); // 남은 시간 (0 초과면 충전 불가)

  // 대시 관련 - 키다운/키업 설정
  const setDashNeedKeyUp = useRef<boolean>(true); // 대시 후 다시 대시하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isDashKeyUp = useRef<boolean>(true); // 대시 후 대시 키가 떼졌는지 여부

  // 대시와 점프 관련 - 웨이브 대시 (공중에서 낙하 중에 하단 방향으로 대시한 후, 대시 시전 시간 내로 지면에서 점프)
  const setWaveDashNeedDrop = useRef<boolean>(true); // 웨이브 대시를 하려면, 대시 전에 캐릭터가 아래로 떨어지고 있어야 하는지 여부
  const ySpeedBeforeDash = useRef<number>(0); // 대시 전 Y축 속도
  const waveDashYForce = 0.45; // 점프 시 Y축 높이가 낮아지도록 보정
  const waveDashXForce = dashSpeedForce.current * 1.6; // 점프 시 X축 속도가 증가하도록 보정

  // 입력된 키
  const keys = useRef<Keys>({});

  // 이펙트 관련
  const setDashEffect = useSetAtom(dashEffectAtom); // 대시 이펙트

  // 사운드 관련 (캐릭터 컴포넌트는 클래스로 변환하면, Rules-of-hooks 이슈로 사운드에서 막힌다)
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
    // 시간 흐름 처리
    setTimeLeft(deltaTime);

    // 대시 처리
    setDash();

    // X축 좌우 이동 및 점프 처리
    setMovement(deltaTime);
    setJump(deltaTime);

    // 위치 변경 및 충돌 처리
    setXPos();
    setYPos(deltaTime);

    // 캐릭터의 상태 처리
    setStatus();
    setView();

    // 렌더링하는 부분
    // 사각형
    context.beginPath();
    if (view.current == "left") {
      context.fillStyle = "green";
    } else {
      context.fillStyle = "red";
    }
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

  /** 캐릭터의 X축 이동을 관리 */
  const setMovement = (deltaTime: number) => {
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
        // 반대로도 마찬가지로 동작
        if (!midAir.current) {
          speed.current.x -= xSpeedAccel.current * deltaTime;
        } else {
          speed.current.x -= xSpeedAccelMidAir * deltaTime;
        }
        if (speed.current.x < 0) speed.current.x = 0;
      }
    }
  };

  /** 캐릭터의 X축 위치 변경 및 충돌 관리 */
  const setXPos = () => {
    // 위치 설정
    xPos.current += Math.round(speed.current.x * 100) / 100;

    // 충돌 감지
    // X축 기준 양쪽 벽에 닿으면 이동 불가
    if (xPos.current + xSize.current > screenWidth) {
      speed.current.x = 0;
      xPos.current = screenWidth - xSize.current;
    } else if (xPos.current < 0) {
      speed.current.x = 0;
      xPos.current = 0;
    }
  };

  /** 캐릭터의 점프를 관리 */
  const setJump = (deltaTime: number) => {
    if (keys.current.hasOwnProperty(keyboardSetting.jump)) {
      if (!setJumpNeedKeyUp.current || isJumpKeyUp.current) {
        if (!midAir.current || coyoteJumpTimeLeft.current > 0) {
          // 지면에서 점프하는 경우, 혹은 코요테 점프인 경우
          midAir.current = true;

          if (dashCastingTimeLeft.current > 0) {
            // 웨이브 대시 혹은 슈퍼 대시
            if (!setWaveDashNeedDrop.current || ySpeedBeforeDash.current > 0) {
              // 웨이브 대시
              // 공중에서 낙하 중에 지면으로 대시한 후, 대시 시전 시간 내로 지면에서 점프할 때 점프 높이가 낮아지고 X축 속도가 증가하도록 보정
              // 지면에서 대시한 후 점프할 때는 대시의 시전 시간이 짧아지므로 상관 없음
              speed.current.y -= ySpeedForce.current * waveDashYForce;

              if (dashChargeNeedTimeLeft.current <= 0) {
                // 대시를 충전할 수 있는 타이밍에 웨이브 대시를 성공했다면, 대시를 충전함
                dashAbleCountLeft.current = dashAbleCount.current;
              }

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
              // 위로 올라가던 중이라 웨이브 대시가 실패하거나, 슈퍼 대시라면 대시를 즉시 종료하며 위로 띄워줌
              // 대시를 종료하지 않으면, 대시 지속 시간이 끝난 후 추가로 인식되어 점프 높이가 2배로 증가
              dashCastingTimeLeft.current = 0;
              speed.current.y -= ySpeedForce.current;
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
        }
      } else if (
        midAir.current &&
        dashCastingTimeLeft.current <= 0 &&
        0.05 * 1000 < performance.now() - lastJumpedTime.current &&
        performance.now() - lastJumpedTime.current < 0.25 * 1000
      ) {
        // 키보드를 꾹 누르고 있으면 높은 점프 (혹은 풀 점프) 판정
        speed.current.y -= gravity.current * longJumpGravityRatio * deltaTime;
      }
    }
  };

  /** 캐릭터의 Y축 위치 변경 및 충돌 관리 */
  const setYPos = (deltaTime: number) => {
    // 중력 계산
    if (midAir.current && dashCastingTimeLeft.current <= 0) {
      // 공중에 떠있으면 중력의 영향을 받아 떨어짐
      // 단, 대시 중에는 영향을 받지 않음
      speed.current.y += gravity.current * deltaTime;
      if (speed.current.y > ySpeedMaximum) {
        speed.current.y = ySpeedMaximum;
      }
    }

    // 위치 설정
    yPos.current += Math.round(speed.current.y * 100) / 100;

    // 충돌 감지
    // 기본적으로 공중에 떠있는 판정으로 취급하며, 지면이나 타일과 충돌 중일때만 지면에 있는 판정으로 변환
    midAir.current = true;

    if (yPos.current + ySize.current >= screenHeight) {
      // Y축 기준 바닥에 닿으면 다시 점프 및 대시 가능
      speed.current.y = 0;
      yPos.current = screenHeight - ySize.current;

      midAir.current = false;
      coyoteJumpTimeLeft.current = coyoteJumpTime.current;

      if (dashChargeNeedTimeLeft.current <= 0) {
        dashAbleCountLeft.current = dashAbleCount.current;
      }
    }
  };

  /** 캐릭터의 대시를 관리 */
  const setDash = () => {
    if (
      keys.current.hasOwnProperty(keyboardSetting.dash) &&
      (!setDashNeedKeyUp.current || isDashKeyUp.current) &&
      dashAbleCountLeft.current > 0 &&
      dashCastingTimeLeft.current <= 0 &&
      dashCooldownLeft.current <= 0
    ) {
      // 1, 2) 대시 키가 눌렸고, 3) 대시 시전 중이 아니고,
      // 4) 대시 재사용 대기시간이 끝났으며, 5) 대시 가능 횟수가 남아있는 경우라면 대시
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
      } else if (keys.current.hasOwnProperty(keyboardSetting.down)) {
        if (keys.current.hasOwnProperty(keyboardSetting.right)) {
          // 우측 하단으로 대시
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
          // 좌측 하단으로 대시
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
          // 하단으로 대시
          setDashOption(180);

          speed.current = {
            x: 0,
            y: dashSpeedForce.current * yDashSpeedForceEdit.current,
          };
        }
      } else if (keys.current.hasOwnProperty(keyboardSetting.right)) {
        if (!keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 우측으로 대시
          setDashOption(90);

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
          setDashOption(270);

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

  /** 대시 과정에서 실행되며, 대시 시전 시 변경될 설정들을 관리 */
  const setDashOption = (degree: degree) => {
    // 대시하면 쿨다운 및 지속 시간 동안 다시 사용 불가능하며,
    // 일정 시간 동안 대시를 충전할 수 없고 대시 사용 가능 횟수를 1회 소모함
    dashCastingTimeLeft.current = dashCastingTime.current;
    dashCooldownLeft.current = dashCooldown.current;
    dashChargeNeedTimeLeft.current = dashChargeNeedTime.current;
    dashAbleCountLeft.current -= 1;

    // 공중으로 대시할 경우 공중에 뜬 판정
    if (degree == 0 || degree == 45 || degree == 315) {
      midAir.current = true;
    }

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

  /** 코요테 점프 가능 시간 및 대시 시전 시간, 재사용 대기시간과 같은 일부 요소들의 시간 흐름을 관리 */
  const setTimeLeft = (deltaTime: number) => {
    // 코요테 점프 가능 시간 감소
    if (coyoteJumpTimeLeft.current > 0) {
      coyoteJumpTimeLeft.current -= deltaTime;
    }

    // 대시 시전 시간, 대시 재사용 대기시간, 대시 충전 불가 시간 감소
    if (dashCastingTimeLeft.current > 0) {
      dashCastingTimeLeft.current -= deltaTime;
    }
    if (dashCooldownLeft.current > 0) {
      dashCooldownLeft.current -= deltaTime;
    }
    if (dashChargeNeedTimeLeft.current > 0) {
      dashChargeNeedTimeLeft.current -= deltaTime;
    }
  }

  /** 캐릭터의 현재 상태를 관리 */
  const setStatus = () => {
    if (dashCastingTimeLeft.current > 0) {
      status.current = "dash";
    } else if (midAir.current) {
      if (speed.current.y > 0) {
        status.current = "midair-down";
      } else {
        status.current = "midair-up";
      }
    } else {
      if (Math.abs(speed.current.x) > 0) {
        status.current = "walk";
      } else {
        status.current = "idle";
      }
    }
  };

  /** 캐릭터가 현재 보고 있는 방향을 관리 */
  const setView = () => {
    if (keys.current.hasOwnProperty(keyboardSetting.right)) {
      view.current = "right";
    } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
      view.current = "left";
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
  }, [keyboardSetting.jump, keyboardSetting.dash]);

  return <></>;
});

Character.displayName = "Character";
export default Character;

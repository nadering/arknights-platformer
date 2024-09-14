"use client";

import {
  forwardRef,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useAtomValue, useAtom } from "jotai";
import {
  resolutionAtom,
  degree,
  keyboardSettingAtom,
  dashEffectAtom,
  DashAfterImageType,
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
  | "midairUp"
  | "midairDown"
  | "landing"
  | "down"
  | "wallClimb";
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

/** 캐릭터 컴포넌트 */
const Character = forwardRef<CharacterHandle>((_, ref) => {
  // 타입
  const type = "Character";

  // 화면 크기
  const resolution = useAtomValue(resolutionAtom);
  const screenWidth = resolution.width;
  const screenHeight = resolution.height;

  // 컴포넌트 크기
  const xSize = useRef<number>(32);
  const ySize = useRef<number>(44);

  // 위치
  const xPos = useRef<number>(0);
  const yPos = useRef<number>(screenHeight - ySize.current);

  // 컴포넌트 히트박스 및 위치 (충돌 판정은 히트박스를 통해 계산)
  const xHitBoxSize = useRef<number>(22);
  const yHitBoxSize = useRef<number>(35);

  const xHitBoxDiff = (xSize.current - xHitBoxSize.current) / 2;
  const yHitBoxDiff = ySize.current - yHitBoxSize.current;

  const xHitBoxPos = useRef<number>(xPos.current + xHitBoxDiff);
  const yHitBoxPos = useRef<number>(yPos.current + yHitBoxDiff);

  // 속도
  const speed = useRef<SpeedProps>({
    x: 0,
    y: 0,
  });

  // 상태 및 보는 방향
  const status = useRef<CharacterStatus>("idle");
  const previousStatus = useRef<CharacterStatus>("idle");
  const view = useRef<CharacterView>("right");

  // 프레임 (애니메이션)
  const frameLeftList = useRef<{ [key: string]: HTMLImageElement[] }>({});
  const frameRightList = useRef<{ [key: string]: HTMLImageElement[] }>({});
  const frameIndex = useRef<number>(0);
  const frameInterval = 80;
  const frameDeltaTime = useRef<number>(0);
  const currentFrame = useRef<HTMLImageElement>();

  // 키보드 설정
  const keyboardSetting = useAtomValue(keyboardSettingAtom);

  // X축 속도 관련
  const xSpeedAccel = useRef<number>(2); // 가속도
  const xSpeedAccelMidAir = xSpeedAccel.current * 0.65; // 공중에서의 가속도
  const xSpeedMaximum = 180; // X축 기준 일반 이동 시 최고 속도
  const xSpeedEdit = 1; // X축 전체 속도 조절

  // Y축 속도 및 점프 관련
  const midAir = useRef<boolean>(false); // 공중에 있는지 여부
  const jumpForce = 210; // 점프 시 Y축으로 가하는 힘
  const ySpeedMaximum = 480; // Y축 기준, 낙하 시 최고 속도
  const gravity = 1.8; // 중력 가속도
  const xJumpForce = 80; // 점프 시, 조작감을 위해 추가로 X축에 가해지는 힘
  // const downKeyMult = 1.5; // 아래 키 누를 때, 중력 및 낙하 최고 속도 증가
  const ySpeedEdit = 1; // Y축 전체 속도 조절

  // 점프 관련 - 높은 점프 (혹은 풀 점프)
  const longJumpTime = 0.4 * 1000; // 높은 점프 키다운 인식 시간
  const lastJumpedTime = useRef<number>(0); // 높은 점프 구현 - 마지막으로 점프한 시간

  // 점프 관련 - 키다운/키업 설정
  const setJumpNeedKeyUp = useRef<boolean>(true); // 점프 후 다시 점프하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isJumpKeyUp = useRef<boolean>(true); // 점프 후 점프 키가 떼졌는지 여부

  // 점프 관련 - 코요테 점프 (공중이어도 코요테 시간 내로는 점프 가능)
  const coyoteJumpTime = 0.08 * 1000; // 코요테 점프 - 허용 시간
  const coyoteJumpTimeLeft = useRef<number>(0); // 코요테 점프 - 남은 시간 (0 이상일 때 코요테 점프 가능)

  // 대시 관련
  const dashSpeed = 480; // 대시 속도
  const dashEndSpeed = 320; // 대시 종료 시 보정되는 속도
  const yDashSpeedEdit = 1; // 대시 중 Y축 높이 보정 (높을수록 더 높게 상승)
  const dashDegree = useRef<degree>(0); // 대시 각도
  const dashToMidAir = useRef<boolean>(false); // 대시를 써서 공중으로 갔는지 여부

  // 대시 관련 - 대시 사용 가능 횟수
  const dashAbleCount = useRef<number>(1); // 대시 사용 가능한 최대 횟수
  const dashAbleCountLeft = useRef<number>(dashAbleCount.current); // 남은 횟수 (0 초과면 대시 사용 가능)

  // 대시 관련 - 대시 시전 시간
  const dashCastingTime = 0.15 * 1000; // 시전에 걸리는 총 시간
  const dashCastingTimeLeft = useRef<number>(0); // 남은 시간 (0 초과면 대시 중이며, 대시 사용 불가)
  const dashEnded = useRef<boolean>(false); // 현재 대시가 끝나면 속도를 조절하기 위한 변수 (대시 끝난 후 True, 속도 조절 후 다시 False)

  // 대시 관련 - 대시 재사용 대기시간
  const dashCooldown = 0.2 * 1000; // 재사용 대기시간 수치
  const dashCooldownLeft = useRef<number>(0); // 남은 시간 (0 초과면 사용 불가)

  // 대시 관련 - 대시 충전 불가 시간
  const dashChargeNeedTime = 0.1 * 1000; // 지면에 닿아도 대시의 충전이 불가능한 시간
  const dashChargeNeedTimeLeft = useRef<number>(0); // 남은 시간 (0 초과면 충전 불가)

  // 대시 관련 - 키다운/키업 설정
  const setDashNeedKeyUp = useRef<boolean>(true); // 대시 후 다시 대시하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isDashKeyUp = useRef<boolean>(true); // 대시 후 대시 키가 떼졌는지 여부

  // 대시와 점프 관련 - 슈퍼 (지면에서 대시 중 점프)
  const superXForce = 520; // 슈퍼 성공 시 X축에 가하는 힘

  // 대시와 점프 관련 - 웨이브 대시 (공중에서 낙하 중에 하단 방향으로 대시한 후, 대시 시전 시간 내로 지면에서 점프)
  const setWaveDashNeedDrop = useRef<boolean>(true); // 웨이브 대시를 하려면, 대시 전에 캐릭터가 아래로 떨어지고 있어야 하는지 여부
  const ySpeedBeforeDash = useRef<number>(0); // 대시 전 Y축 속도
  const waveDashYForce = 154; // 웨이브 대시 성공 시 Y축에 가하는 힘 (원래는 110이지만, 컨트롤 편의성을 위해 40% 가량 상향 조정)
  const waveDashXForce = superXForce * 1.25; // 웨이브 대시 성공 시 X축에 가하는 힘

  // 입력된 키
  const keys = useRef<Keys>({});

  // 이펙트 관련
  // 대시 이펙트
  const [dashEffectSetting, setDashEffectSetting] = useAtom(dashEffectAtom); // 대시 이펙트 정보를 담고 있는 아톰
  const dashEffectIntervalLeft = useRef<number>(0); // 대시 이펙트 중 다음 잔상 추가까지 남은 시간

  // 사운드 관련 (캐릭터 컴포넌트는 클래스로 변환하면, Rules-of-hooks 이슈로 사운드에서 막힌다)
  const { audioLoaded, audios } = useAudio({
    dash: { sourceUrl: "/audio/effects/dash.mp3", volume: 0.4 },
    landingSlow: { sourceUrl: "/audio/character/landing.wav", volume: 0.175 },
    landingFast: { sourceUrl: "/audio/character/landing.wav", volume: 0.35 },
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

    // 대시가 끝나면 속도 처리
    setAfterDash();

    // 대시 이펙트 처리
    setDashEffect(deltaTime);

    // X축 좌우 이동 및 점프 처리
    setMovement(deltaTime);
    setJump();

    // 위치 변경 및 충돌 처리
    setXPos(deltaTime);
    setYPos(deltaTime);

    // 캐릭터의 상태 처리
    setStatus();
    setView();

    // 캐릭터 이미지 설정
    setImage();

    // 렌더링하는 부분
    context.drawImage(
      currentFrame.current!,
      xPos.current,
      yPos.current,
      xSize.current,
      ySize.current
    );
  };

  /** 캐릭터의 좌우 방향키를 통한 X축 이동을 관리 */
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
  const setXPos = (deltaTime: number) => {
    // 위치 설정
    xPos.current += (speed.current.x * xSpeedEdit * deltaTime) / 1000;
    xHitBoxPos.current = xPos.current + xHitBoxDiff;

    // 충돌 감지
    // X축 기준 양쪽 벽에 닿으면 이동 불가
    if (xHitBoxPos.current + xHitBoxSize.current > screenWidth) {
      speed.current.x = 0;
      xHitBoxPos.current = screenWidth - xHitBoxSize.current;
      xPos.current = xHitBoxPos.current - xHitBoxDiff;
    } else if (xHitBoxPos.current < 0) {
      speed.current.x = 0;
      xHitBoxPos.current = 0;
      xPos.current = xHitBoxPos.current - xHitBoxDiff;
    }
  };

  /** 캐릭터의 점프 및 대시 후 점프 기술을 관리 */
  const setJump = () => {
    if (keys.current.hasOwnProperty(keyboardSetting.jump)) {
      if (!setJumpNeedKeyUp.current || isJumpKeyUp.current) {
        if (!midAir.current || coyoteJumpTimeLeft.current > 0) {
          // 지면에서 점프하는 경우, 혹은 코요테 점프인 경우
          midAir.current = true;

          if (dashCastingTimeLeft.current > 0) {
            // 대시 중에 점프할 경우 웨이브 대시 혹은 슈퍼로 추정하며, 대시를 즉시 종료하고 대시 후 점프한 것으로 "명확히" 판정
            dashCastingTimeLeft.current = 0;
            dashToMidAir.current = false;

            if (dashDegree.current == 135 || dashDegree.current == 225) {
              // 좌측 하단이나 우측 하단으로 대시하면 웨이브 대시
              if (
                !setWaveDashNeedDrop.current ||
                ySpeedBeforeDash.current > 0
              ) {
                // 공중에서 낙하 중일 때 대시해야 성공하며, 성공할 경우 낮게 점프하며 가속을 받음
                speed.current.y = -waveDashYForce;

                if (keys.current.hasOwnProperty(keyboardSetting.right)) {
                  // 우측 방향으로 이동 중인 경우
                  speed.current.x = waveDashXForce;
                } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
                  // 좌측 방향으로 이동 중인 경우
                  speed.current.x = -waveDashXForce;
                }
              } else {
                // 웨이브 대시에 실패하면 일반 점프
                speed.current.y = -jumpForce;
              }
            } else if (dashDegree.current == 90 || dashDegree.current == 270) {
              // 좌측이나 우측으로 대시하면 슈퍼
              if (keys.current.hasOwnProperty(keyboardSetting.right)) {
                // 우측 방향으로 이동 중인 경우
                speed.current.x = superXForce;
              } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
                // 좌측 방향으로 이동 중인 경우
                speed.current.x = -superXForce;
              }
              // 점프 높이는 일반 점프와 동일
              speed.current.y = -jumpForce;
            } else {
              // 예외 처리 (예외 발생 시, 이중 점프를 방지하기 위해 대시 종료 외 아무 처리도 하지 않음)
            }
          } else {
            // 웨이브 대시 및 슈퍼가 아니면 일반적인 점프
            speed.current.y = -jumpForce;
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
      }
    }
  };

  /** 캐릭터의 Y축 위치 변경 및 충돌 관리 */
  const setYPos = (deltaTime: number) => {
    // 중력 계산
    if (midAir.current && dashCastingTimeLeft.current <= 0) {
      // 공중에 떠있으면 중력의 영향을 받아 떨어짐
      // 단, 대시 중에는 영향을 받지 않음
      if (
        keys.current.hasOwnProperty(keyboardSetting.jump) &&
        !dashToMidAir.current &&
        (performance.now() - lastJumpedTime.current < longJumpTime ||
          Math.abs(speed.current.y) < 80)
      ) {
        // 키보드를 꾹 누르고 있으면 높은 점프 (혹은 풀 점프) 판정으로, 중력의 영향이 감소
        // 단, 대시를 써서 공중으로 간 경우 적용되지 않음
        speed.current.y += gravity * 0.4 * deltaTime;
      } else {
        speed.current.y += gravity * deltaTime;
      }

      if (speed.current.y > ySpeedMaximum) {
        // 낙하 최고 속도를 초과하지 않도록 설정
        speed.current.y = ySpeedMaximum;
      }
    }

    // 위치 설정
    yPos.current += (speed.current.y * ySpeedEdit * deltaTime) / 1000;
    yHitBoxPos.current = yPos.current + yHitBoxDiff;

    // 충돌 감지
    // 기본적으로 공중에 떠있는 판정으로 취급하며, 지면이나 타일과 충돌 중일때만 지면에 있는 판정으로 변환
    midAir.current = true;

    if (yHitBoxPos.current + yHitBoxSize.current >= screenHeight) {
      // Y축 기준 바닥에 닿으면 다시 점프 및 대시 가능
      const beforeYSpeed = speed.current.y;

      // Y축 속도를 초기화하고, 캐릭터가 지면을 관통하지 않도록 위치를 설정
      speed.current.y = 0;
      yHitBoxPos.current = screenHeight - yHitBoxSize.current;
      yPos.current = yHitBoxPos.current - yHitBoxDiff;

      // 지면에 있다고 설정
      midAir.current = false;
      coyoteJumpTimeLeft.current = coyoteJumpTime;

      if (dashChargeNeedTimeLeft.current <= 0) {
        // 대시 시전 후 일정 시간이 지나 충전이 가능하면, 대시를 충전
        dashAbleCountLeft.current = dashAbleCount.current;
      }
      if (dashCastingTimeLeft.current <= 0) {
        // 대시를 시전 중이 아니면 대시를 통해 공중에 가지 않았으므로, 높은 점프가 가능하도록 설정
        // 이 조건문이 참이 되려면 대시를 시전하지 않았거나, 대시 시전이 끝났을 때 지면에 있어야 함
        dashToMidAir.current = false;
      }

      // 대시 중이 아닐 때 공중에서 낙하하면, 착지 사운드 재생
      if (beforeYSpeed > 0 && dashCastingTimeLeft.current <= 0) {
        if (beforeYSpeed >= ySpeedMaximum * 0.625) {
          audios.get("landingFast")?.();
        } else {
          audios.get("landingSlow")?.();
        }
      }
    }
  };

  /** 캐릭터의 대시 방향 및 속도를 관리 */
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
          const newXSpeed = dashSpeed * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed > newXSpeed ? beforeXSpeed : newXSpeed,
            y: -dashSpeed * Math.cos(Math.PI / 4) * yDashSpeedEdit,
          };
        } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 좌측 상단으로 대시
          setDashOption(315);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          const newXSpeed = -dashSpeed * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed < newXSpeed ? beforeXSpeed : newXSpeed,
            y: -dashSpeed * Math.cos(Math.PI / 4) * yDashSpeedEdit,
          };
        } else {
          // 상단으로 대시
          setDashOption(0);

          speed.current = {
            x: 0,
            y: -dashSpeed * yDashSpeedEdit,
          };
        }
      } else if (keys.current.hasOwnProperty(keyboardSetting.down)) {
        if (keys.current.hasOwnProperty(keyboardSetting.right)) {
          // 우측 하단으로 대시
          setDashOption(135);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          const newXSpeed = dashSpeed * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed > newXSpeed ? beforeXSpeed : newXSpeed,
            y: dashSpeed * Math.cos(Math.PI / 4) * yDashSpeedEdit,
          };
        } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 좌측 하단으로 대시
          setDashOption(225);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          const newXSpeed = -dashSpeed * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed < newXSpeed ? beforeXSpeed : newXSpeed,
            y: dashSpeed * Math.cos(Math.PI / 4) * yDashSpeedEdit,
          };
        } else if (
          !keys.current.hasOwnProperty(keyboardSetting.up) &&
          midAir.current
        ) {
          // (공중에 있다면) 하단으로 대시
          setDashOption(180);

          speed.current = {
            x: 0,
            y: dashSpeed * yDashSpeedEdit,
          };
        }
      } else if (keys.current.hasOwnProperty(keyboardSetting.right)) {
        if (!keys.current.hasOwnProperty(keyboardSetting.left)) {
          // 우측으로 대시
          setDashOption(90);

          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          speed.current = {
            x: beforeXSpeed > dashSpeed ? beforeXSpeed : dashSpeed,
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
            x: beforeXSpeed < -dashSpeed ? beforeXSpeed : -dashSpeed,
            y: 0,
          };
        }
      }
    }
  };

  /** 대시 과정에서 실행되며, 대시 시전 시 1회 변경될 설정들을 관리 */
  const setDashOption = (degree: degree) => {
    // 대시하면 쿨다운 및 지속 시간 동안 다시 사용 불가능하며,
    // 일정 시간 동안 대시를 충전할 수 없고 대시 사용 가능 횟수를 1회 소모함
    dashCastingTimeLeft.current = dashCastingTime;
    dashCooldownLeft.current = dashCooldown;
    dashChargeNeedTimeLeft.current = dashChargeNeedTime;
    dashAbleCountLeft.current -= 1;

    // 대시 각도 및 대시가 끝났는지 확인
    dashDegree.current = degree;
    dashEnded.current = false;

    // 대시를 통해 공중으로 갔는지 확인
    // 대시 각도를 수평으로 써도, 플랫폼 밖으로 나가면 공중으로 간 상태이므로 각도에 따라 설정하지 않음
    dashToMidAir.current = true;

    // 공중으로 대시할 경우 공중에 뜬 판정이 되도록 설정
    if (degree == 0 || degree == 45 || degree == 315) {
      midAir.current = true;
    }

    // 웨이브 대시 구현을 위해 대시 전 Y축 속도를 저장 (Y축 속도가 양수, 즉 떨어지고 있을 때만 가능)
    ySpeedBeforeDash.current = speed.current.y;

    // 대시 키를 꾹 누르고 있으면 연속으로 나가는 경우 방지
    isDashKeyUp.current = false;

    // 대시 사운드 재생
    if (audioLoaded) {
      audios.get("dash")?.();
    }
  };

  /** 대시가 끝난 후, 대시 방향에 따라 속도가 달라지도록 관리 */
  const setAfterDash = () => {
    if (dashEnded.current) {
      switch (dashDegree.current) {
        case 0:
        case 45:
        case 90:
        case 270:
        case 315:
          // 속력을 구한 후, 속도를 320 pps가 되도록 조정
          const scala = Math.sqrt(speed.current.x ** 2 + speed.current.y ** 2);
          if (scala != 0) {
            const multiplier = dashEndSpeed / scala;
            speed.current.x *= multiplier;
            speed.current.y *= multiplier;
          }
          break;
      }
      switch (dashDegree.current) {
        case 0:
        case 45:
        case 315:
          // 위 방향 대시의 경우, Y축의 속도가 75%로 감소
          speed.current.y *= 0.75;
          break;
      }
      dashEnded.current = false;
    }
  };

  /** 대시 이펙트를 관리하며, 대시 이펙트를 활성화하고 잔상을 추가 */
  const setDashEffect = (deltaTime: number) => {
    // 일정 시간마다 잔상을 남기기 위해, 다음 잔상까지 남은 시간을 감소
    if (dashEffectIntervalLeft.current > 0) {
      dashEffectIntervalLeft.current -= deltaTime;
    }

    // 잔상을 요구 개수만큼 채웠다면, 다음 대시까지 더 이상 이펙트를 추가하지 않음
    if (
      dashEffectSetting.afterImageList.length >= dashEffectSetting.effectCount
    ) {
      dashEffectIntervalLeft.current = 0;
      return;
    }

    if (dashCastingTimeLeft.current > 0) {
      // 대시 중일 때만 이펙트를 설정하기 시작해서, 잔상을 하나씩 추가하여 최대 요구 개수만큼 채움
      // 만약 잔상을 추가하던 도중 대시가 중단되면 (웨이브 대시나 슈퍼 등), 더 이상 잔상을 추가하지 않음
      // 잔상 추가가 중지되면, 대시 이펙트 컴포넌트는 현재 남아있는 잔상의 투명도를 낮춰가며 렌더링한 후, 잔상을 모두 출력하면 렌더링을 종료함
      if (!dashEffectSetting.active) {
        // 대시 이펙트가 활성화된 상태가 아니었다면, 첫 번째 잔상을 추가하고,
        const afterImageList: DashAfterImageType[] = [
          {
            xPos: xPos.current,
            yPos: yPos.current,
            xSize: xSize.current,
            ySize: ySize.current,
            displayCount: dashEffectSetting.effectCount,
            direction: view.current,
          },
        ];

        // 잔상까지 남은 시간을 같이 활성화한 후, 이펙트를 활성화함
        dashEffectIntervalLeft.current = dashEffectSetting.interval;
        setDashEffectSetting((prev) => {
          return { ...prev, active: true, afterImageList: afterImageList };
        });
      } else {
        if (dashEffectIntervalLeft.current <= 0) {
          // 잔상을 추가할 시간이 되면, 시간을 새롭게 설정하고 잔상을 하나 추가함
          dashEffectIntervalLeft.current = dashEffectSetting.interval;

          setDashEffectSetting((prev) => {
            prev.afterImageList.push({
              xPos: xPos.current,
              yPos: yPos.current,
              xSize: xSize.current,
              ySize: ySize.current,
              displayCount: dashEffectSetting.effectCount,
              direction: view.current,
            });
            return prev;
          });
        }
      }
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

      if (dashCastingTimeLeft.current <= 0) {
        // 대시가 끝나면, 속도를 1회 조절함
        dashEnded.current = true;
      }
    }
    if (dashCooldownLeft.current > 0) {
      dashCooldownLeft.current -= deltaTime;
    }
    if (dashChargeNeedTimeLeft.current > 0) {
      dashChargeNeedTimeLeft.current -= deltaTime;
    }

    // 일정 시간마다 다음 프레임으로 넘어가기 위해, 남은 시간을 감소
    if (frameDeltaTime.current > 0) {
      frameDeltaTime.current -= deltaTime;
    }
  };

  /** 캐릭터 이미지의 종류를 위해 캐릭터의 현재 상태를 관리 */
  const setStatus = () => {
    if (dashCastingTimeLeft.current > 0) {
      status.current = "dash";
    } else if (midAir.current) {
      if (speed.current.y > 0) {
        status.current = "midairDown";
      } else {
        status.current = "midairUp";
      }
    } else {
      if (
        Math.abs(speed.current.x) > 0 ||
        keys.current.hasOwnProperty(keyboardSetting.right) ||
        keys.current.hasOwnProperty(keyboardSetting.left)
      ) {
        status.current = "walk";
      } else {
        status.current = "idle";
      }
    }
  };

  /** 캐릭터 이미지의 좌우 반전을 위해 캐릭터가 현재 보고 있는 방향을 관리 */
  const setView = () => {
    if (keys.current.hasOwnProperty(keyboardSetting.right)) {
      view.current = "right";
    } else if (keys.current.hasOwnProperty(keyboardSetting.left)) {
      view.current = "left";
    }
  };

  /** 캐릭터 이미지를 관리 */
  const setImage = () => {
    if (previousStatus.current == status.current) {
      // 이전 프레임과 같은 상태라면, 애니메이션 진행
      if (frameDeltaTime.current <= 0) {
        // 프레임 간격이 지났으면, 다음 프레임으로 진행
        frameIndex.current =
          (frameIndex.current + 1) %
          frameLeftList.current[status.current].length;
        frameDeltaTime.current += frameInterval;
      }
    } else {
      // 이전 프레임과 다른 상태라면, 프레임 간격을 기다리지 않고 다른 상태로 즉시 이미지 변경
      frameIndex.current = 0;
      frameDeltaTime.current = frameInterval;
    }

    // 이미지 변경
    if (view.current == "left") {
      currentFrame.current =
        frameLeftList.current[status.current][frameIndex.current];
    } else {
      currentFrame.current =
        frameRightList.current[status.current][frameIndex.current];
    }

    // 현재 프레임은 다음 프레임에 이전 프레임으로 됨
    previousStatus.current = status.current;
  };

  // 이미지 프리로딩
  useEffect(() => {
    // 이미지 데이터
    const imageData: {
      [key: string]: number;
    } = {
      dash: 1,
      idle: 6,
      landing: 1,
      midairUp: 1,
      midairDown: 2,
      walk: 4,
    };

    for (const [key, value] of Object.entries(imageData)) {
      const imageLeftList: HTMLImageElement[] = [];
      const imageRightList: HTMLImageElement[] = [];
      for (let i = 0; i < value; i++) {
        const imageLeftSrc = `/image/character/left/${key}-${i}.png`;
        const imageLeft = new Image();
        imageLeft.src = imageLeftSrc;
        imageLeftList.push(imageLeft);

        const imageRightSrc = `/image/character/right/${key}-${i}.png`;
        const imageRight = new Image();
        imageRight.src = imageRightSrc;
        imageRightList.push(imageRight);
      }
      frameLeftList.current[key] = imageLeftList;
      frameRightList.current[key] = imageRightList;
    }

    // 현재 프레임을 미리 설정
    currentFrame.current = frameRightList.current["idle"][0];
  }, []);

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

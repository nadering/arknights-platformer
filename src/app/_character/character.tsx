"use client";

import {
  forwardRef,
  MutableRefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { resolutionAtom, DashEffectAtom, degree } from "@store";

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
  render: ({
    context,
    deltaTime,
  }: {
    context: CanvasRenderingContext2D;
    deltaTime: number;
  }) => void;
  xSize: MutableRefObject<number>;
  ySize: MutableRefObject<number>;
  xPos: MutableRefObject<number>;
  yPos: MutableRefObject<number>;
}

const Character = forwardRef<CharacterHandle>((_, ref) => {
  // 화면 크기
  const resolution = useAtomValue(resolutionAtom);
  const screenWidth = resolution.width;
  const screenHeight = resolution.height;

  // 컴포넌트 크기
  const xSize = useRef<number>(50);
  const ySize = useRef<number>(50);

  /* // 컴포넌트 표시
  const frameIndex = useRef<number>(0);
  const frameCount = useRef<number>(6);
  const frameInterval = useRef<number>(80);
  const frameDeltaTime = useRef<number>(0); */

  // 위치
  const xPos = useRef<number>(0);
  const yPos = useRef<number>(screenHeight - ySize.current);

  // 속도
  const speed = useRef<SpeedProps>({
    x: 0,
    y: 0,
  });

  // 키보드 설정
  const jumpKey = useRef<string>("c");
  const dashKey = useRef<string>("z");
  const upMoveKey = useRef<string>("ArrowUp");
  const downMoveKey = useRef<string>("ArrowDown");
  const leftMoveKey = useRef<string>("ArrowLeft");
  const rightMoveKey = useRef<string>("ArrowRight");

  // X축 속도 관련
  const xSpeedAccel = useRef<number>(0.045); // 가속도
  const xSpeedAccelMidAir = useRef<number>(xSpeedAccel.current * 0.65); // 공중에서의 가속도
  const xSpeedMaximum = useRef<number>(xSpeedAccel.current * 100); // X축 기준 일반 이동 시 최고 속도
  const xJumpForce = useRef<number>(xSpeedAccel.current * 40); // 점프 시 추가로 X축에 가해지는 힘

  // Y축 속도 및 점프 관련
  const midAir = useRef<boolean>(false); // 공중 여부
  const ySpeedForce = useRef<number>(6.5); // 점프에 Y축으로 가하는 힘
  const gravity = useRef<number>(0.03); // 중력 가속도
  const ySpeedMaximum = useRef<number>(gravity.current * 400); // Y축 기준 낙하 시 최고 속도
  const lastJumpedTime = useRef<number>(0); // 높은 점프 구현 - 마지막으로 점프한 시간
  const longJumpGravityRatio = useRef<number>(0.55); // 높은 점프 구현 - 중력 감소 비율 (높을수록 점프 최대 높이가 증가)
  const setJumpNeedKeyUp = useRef<boolean>(false); // 점프 후 다시 점프하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isJumpKeyUp = useRef<boolean>(true); // 점프 후 점프 키가 떼졌는지 여부
  // const coyoteJumpTime = useRef<number>(0.08 * 1000); // 코요테 점프 - 공중이어도 코요테 시간 내로는 점프 가능
  // const coyoteJumpTimeLeft = useRef<number>(0); // 코요테 점프 - 남은 시간 (0 이상일 때 코요테 점프 가능)

  // 대시 관련
  const dashSpeedForce = useRef<number>(10.8); // 대시에 가하는 힘
  const yDashSpeedForceEdit = useRef<number>(0.6); // Y축이 어색하게 나와 보정하는 용도 (높을수록 더 높게 상승)
  const dashCastingTime = useRef<number>(0.165 * 1000); // 대시 시전 시간
  const dashCastingTimeLeft = useRef<number>(0); // 대시 시전 시간 - 남은 시간 (0 이상이면 대시 중이며, 대시 사용 불가)
  const dashCooldown = useRef<number>(0.33 * 1000); // 대시 재사용 대기시간
  const dashCooldownLeft = useRef<number>(0); // 대시 재사용 대기시간 - 남은 시간 (0 이상이면 사용 불가)
  const canDashWithMidAir = useRef<boolean>(true); // 한 번 대시한 후, 다시 대시할 수 있는지 여부 (일반적으로 지표면을 밟으면 다시 대시할 수 있음)
  const setDashNeedKeyUp = useRef<boolean>(true); // 대시 후 다시 대시하려면, 키를 뗐다가 다시 눌러야 하는지 여부
  const isDashKeyUp = useRef<boolean>(true); // 대시 후 대시 키가 떼졌는지 여부

  // 입력된 키
  const keys = useRef<Keys>({});

  // 이펙트 관련
  const setDashEffect = useSetAtom(DashEffectAtom); // 대시 이펙트

  /** 부모 컴포넌트에서 사용할 값들 선언 */
  useImperativeHandle(ref, () => {
    return {
      // 렌더링
      render: ({
        context,
        deltaTime,
      }: {
        context: CanvasRenderingContext2D;
        deltaTime: number;
      }) => render({ context, deltaTime }),
      // 크기
      xSize,
      ySize,
      // 위치
      xPos,
      yPos,
    };
  });

  /** 캐릭터 렌더링 */
  const render = ({
    context,
    deltaTime,
  }: {
    context: CanvasRenderingContext2D;
    deltaTime: number;
  }) => {
    // 키보드 입력에 따라 속도 변경
    // X축 및 Y축 속도 설정
    setXSpeed(deltaTime);
    setYSpeed(deltaTime);

    // 대시 설정
    setDash(deltaTime);

    // 위치 변경
    setXPos();
    setYPos();

    // 렌더링하는 부분
    // 사각형
    context.beginPath();
    context.fillStyle = "green";
    context.strokeRect(
      xPos.current,
      yPos.current,
      xSize.current,
      ySize.current
    );
    context.fillRect(xPos.current, yPos.current, xSize.current, ySize.current);
    context.closePath();

    /*
    // 캐릭터 이미지
    frameDeltaTime.current += deltaTime;
    if (frameDeltaTime.current > frameInterval.current) {
      frameDeltaTime.current -= frameInterval.current;
      frameIndex.current = (frameIndex.current + 1) % frameCount.current;
    }

    const characterImage = new Image();
    characterImage.src = `/image/frame000${frameIndex.current}.png`;
    context.drawImage(
      characterImage,
      xPos.current,
      yPos.current,
      xSize.current,
      ySize.current
    );
    */
  };

  /** 캐릭터의 X축 속도를 조절 */
  const setXSpeed = (deltaTime: number) => {
    // 방향키 입력 여부
    let moved: boolean = false;

    if (keys.current.hasOwnProperty(rightMoveKey.current)) {
      // 오른쪽 이동
      moved = true;
      if (!midAir.current) {
        // 지면
        if (speed.current.x >= xSpeedMaximum.current) {
          // 최고 속도 이상
          speed.current.x -= xSpeedAccel.current * 0.4 * deltaTime;
          if (speed.current.x < xSpeedMaximum.current)
            speed.current.x = xSpeedMaximum.current;
        } else {
          // 최고 속도 미만
          speed.current.x += xSpeedAccel.current * deltaTime;
          if (speed.current.x > xSpeedMaximum.current)
            speed.current.x = xSpeedMaximum.current;
        }
      } else {
        // 공중 (속도 증감량이 상대적으로 적음)
        if (speed.current.x >= xSpeedMaximum.current) {
          // 최고 속도 이상
          speed.current.x -= xSpeedAccelMidAir.current * 0.4 * deltaTime;
          if (speed.current.x < xSpeedMaximum.current)
            speed.current.x = xSpeedMaximum.current;
        } else {
          // 최고 속도 미만
          speed.current.x += xSpeedAccelMidAir.current * deltaTime;
          if (speed.current.x > xSpeedMaximum.current)
            speed.current.x = xSpeedMaximum.current;
        }
      }
    }

    if (keys.current.hasOwnProperty(leftMoveKey.current)) {
      // 왼쪽 이동
      moved = true;
      if (!midAir.current) {
        // 지면
        if (-speed.current.x >= xSpeedMaximum.current) {
          // 최고 속도 이상
          speed.current.x += xSpeedAccel.current * 0.4 * deltaTime;
          if (-speed.current.x < xSpeedMaximum.current)
            speed.current.x = -xSpeedMaximum.current;
        } else {
          // 최고 속도 미만
          speed.current.x -= xSpeedAccel.current * deltaTime;
          if (-speed.current.x > xSpeedMaximum.current)
            speed.current.x = -xSpeedMaximum.current;
        }
      } else {
        // 공중 (속도 증감량이 상대적으로 적음)
        if (-speed.current.x >= xSpeedMaximum.current) {
          // 최고 속도 이상
          speed.current.x += xSpeedAccelMidAir.current * 0.4 * deltaTime;
          if (-speed.current.x < xSpeedMaximum.current)
            speed.current.x = -xSpeedMaximum.current;
        } else {
          // 최고 속도 미만
          speed.current.x -= xSpeedAccelMidAir.current * deltaTime;
          if (-speed.current.x > xSpeedMaximum.current)
            speed.current.x = -xSpeedMaximum.current;
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
          speed.current.x += xSpeedAccelMidAir.current * deltaTime;
        }
        if (speed.current.x > 0) speed.current.x = 0;
      } else {
        // 반대로도 마찬가지로 작동
        if (!midAir.current) {
          speed.current.x -= xSpeedAccel.current * deltaTime;
        } else {
          speed.current.x -= xSpeedAccelMidAir.current * deltaTime;
        }
        if (speed.current.x < 0) speed.current.x = 0;
      }
    }
  };

  /** 캐릭터의 X축 위치를 조절 */
  const setXPos = () => {
    xPos.current += speed.current.x;

    // X축 기준 양쪽 벽에 닿으면 이동 불가
    if (xPos.current + xSize.current > screenWidth) {
      speed.current.x = 0;
      xPos.current = screenWidth - xSize.current;
    } else if (xPos.current < 0) {
      speed.current.x = 0;
      xPos.current = 0;
    }
  };

  /** 캐릭터의 Y축 이동을 조절 */
  const setYSpeed = (deltaTime: number) => {
    if (keys.current.hasOwnProperty(jumpKey.current)) {
      if (
        !midAir.current &&
        (!setJumpNeedKeyUp.current || isJumpKeyUp.current)
      ) {
        // 낮은 점프
        midAir.current = true;
        speed.current.y -= ySpeedForce.current;

        // 높은 점프를 위해 추가
        lastJumpedTime.current = performance.now();

        // 점프 키를 꾹 누르고 있으면 연속으로 나가는 경우 방지
        isJumpKeyUp.current = false;

        // 좌우 방향키가 눌린 상태면, 해당 방향으로 약간 가속을 줌
        if (keys.current.hasOwnProperty(rightMoveKey.current)) {
          speed.current.x += xJumpForce.current;
        } else if (keys.current.hasOwnProperty(leftMoveKey.current)) {
          speed.current.x -= xJumpForce.current;
        }
      } else if (
        // 높은 점프 (키보드 꾹 누른 기준)
        dashCastingTimeLeft.current <= 0 &&
        0.1 * 1000 < performance.now() - lastJumpedTime.current &&
        performance.now() - lastJumpedTime.current < 0.25 * 1000
      ) {
        speed.current.y -= gravity.current * longJumpGravityRatio.current * deltaTime;
      }
    }

    if (midAir.current && dashCastingTimeLeft.current <= 0) {
      // 공중에 떠있으면 중력의 영향을 받아 떨어짐
      // 단, 대시 중에는 영향을 받지 않음
      if (keys.current.hasOwnProperty(downMoveKey.current)) {
        // 아래 키를 누르고 있으면 중력의 영향을 더 크게 받음
        speed.current.y += gravity.current * 1.5 * deltaTime;
        if (speed.current.y > ySpeedMaximum.current * 1.5) {
          speed.current.y = ySpeedMaximum.current * 1.5;
        }
      } else {
        speed.current.y += gravity.current * deltaTime;
        if (speed.current.y > ySpeedMaximum.current) {
          speed.current.y = ySpeedMaximum.current;
        }
      }
    }
  };

  /** 캐릭터의 Y축 위치를 조절 */
  const setYPos = () => {
    yPos.current += speed.current.y;

    // Y축 기준 공중에 있다가 바닥에 닿으면 다시 점프 및 대시 가능
    if (midAir.current && yPos.current + ySize.current > screenHeight) {
      speed.current.y = 0;
      yPos.current = screenHeight - ySize.current;

      midAir.current = false;
      canDashWithMidAir.current = true;
    }
  };

  /** 캐릭터의 대시 속도 및 재사용 대기시간과 시전 시간을 조절 */
  const setDash = (deltaTime: number) => {
    // 시전 시간 및 재사용 대기시간 감소
    if (dashCastingTimeLeft.current > 0) {
      dashCastingTimeLeft.current -= deltaTime;
    }
    if (dashCooldownLeft.current > 0) {
      dashCooldownLeft.current -= deltaTime;
    }

    if (
      keys.current.hasOwnProperty(dashKey.current) &&
      (!setDashNeedKeyUp.current || isDashKeyUp.current) &&
      dashCastingTimeLeft.current <= 0 &&
      dashCooldownLeft.current <= 0 &&
      canDashWithMidAir.current
    ) {
      // 1, 2) 대시 키가 눌렸고, 3) 대시 시전 중이 아니고,
      // 4) 대시 재사용 대기시간이 끝났으며, 5) 공중에서 이미 대시를 하지 않은 경우라면 대시
      if (keys.current.hasOwnProperty(upMoveKey.current)) {
        if (keys.current.hasOwnProperty(rightMoveKey.current)) {
          // 우측 상단으로 대시
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
          setDashOption(45);
        } else if (keys.current.hasOwnProperty(leftMoveKey.current)) {
          // 좌측 상단으로 대시
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
          setDashOption(315);
        } else {
          // 상단으로 대시
          speed.current = {
            x: 0,
            y: -dashSpeedForce.current * yDashSpeedForceEdit.current * 0.9,
          };
          setDashOption(0);
        }
      } else if (
        keys.current.hasOwnProperty(downMoveKey.current) &&
        midAir.current
      ) {
        if (keys.current.hasOwnProperty(rightMoveKey.current)) {
          // (공중에 있으면) 우측 하단으로 대시
          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          const newXSpeed = dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed > newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current *
              1.2,
          };
          setDashOption(135);
        } else if (keys.current.hasOwnProperty(leftMoveKey.current)) {
          // (공중에 있으면) 좌측 하단으로 대시
          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          const newXSpeed = -dashSpeedForce.current * Math.sin(Math.PI / 4);

          speed.current = {
            x: beforeXSpeed < newXSpeed ? beforeXSpeed : newXSpeed,
            y:
              dashSpeedForce.current *
              Math.cos(Math.PI / 4) *
              yDashSpeedForceEdit.current *
              1.2,
          };
          setDashOption(225);
        } else if (!keys.current.hasOwnProperty(upMoveKey.current)) {
          // (공중에 있으면) 하단으로 대시
          speed.current = {
            x: 0,
            y: dashSpeedForce.current * yDashSpeedForceEdit.current * 1.2,
          };
          setDashOption(180);
        }
      } else if (keys.current.hasOwnProperty(rightMoveKey.current)) {
        if (!keys.current.hasOwnProperty(leftMoveKey.current)) {
          // 우측으로 대시
          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = speed.current.x;
          speed.current = {
            x:
              beforeXSpeed > dashSpeedForce.current
                ? beforeXSpeed
                : dashSpeedForce.current,
            y: 0,
          };
          setDashOption(90, true);
        }
      } else if (keys.current.hasOwnProperty(leftMoveKey.current)) {
        if (!keys.current.hasOwnProperty(rightMoveKey.current)) {
          // 좌측으로 대시
          // 기존 X축 이동 속도가 더 빠르다면 해당 속도를 유지함
          const beforeXSpeed = -speed.current.x;
          speed.current = {
            x:
              beforeXSpeed < -dashSpeedForce.current
                ? beforeXSpeed
                : -dashSpeedForce.current,
            y: 0,
          };
          setDashOption(270, true);
        }
      }
    }
  };

  /** 대시 후 실행되며, 대시 관련 설정을 담당 */
  const setDashOption = (degree: degree, toMidAir: boolean = false) => {
    // 대시 키를 꾹 누르고 있으면 연속으로 나가는 경우 방지
    isDashKeyUp.current = false;

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

    // 대시 이펙트 활성화
    setDashEffect({
      active: true,
      degree,
      xPos: xPos.current + xSize.current / 2,
      yPos: yPos.current + ySize.current / 2,
    });
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
          case jumpKey.current:
            isJumpKeyUp.current = true;
            break;
          case dashKey.current:
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

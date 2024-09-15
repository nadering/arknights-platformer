/** 충돌 가능한 방향 */
export type CollidableDirection = "top" | "right" | "bottom" | "left";

/** 단일 블록 클래스 */
export default class Block {
  // 크기
  public xSize = 0;
  public ySize = 0;

  // 위치
  public xPos = 0;
  public yPos = 0;

  // 충돌 가능 방향
  public collidable: CollidableDirection[] = [];

  // 프레임 (단일)
  private _currentFrame: null | HTMLImageElement = null; // 현재 프레임
  private _frameLoaded: HTMLImageElement[] = []; // 프리로딩한 프레임

  /** 생성자, 이미지 프리로딩 진행 */
  public constructor() {
    const blockTypeCount = 4;
    for (let i = 0; i < blockTypeCount; i++) {
      // 이미지 프리로딩
      const imageSrc = `/image/map/block/block-${i}.png`;
      const image = new Image();
      image.src = imageSrc;
      this._frameLoaded.push(image);
    }
    this._currentFrame = this._frameLoaded[0];
  }

  /** 블록 렌더링 메소드 */
  public render = ({
    context,
    cameraXPos,
    cameraYPos,
  }: {
    context: CanvasRenderingContext2D;
    cameraXPos: number;
    cameraYPos: number;
  }) => {
    if (this._currentFrame) {
      context.drawImage(
        this._currentFrame,
        Math.floor(this.xPos - cameraXPos),
        Math.floor(this.yPos - cameraYPos),
        this.xSize,
        this.ySize
      );
    }
  };

  /** 블록 사이즈 설정 */
  public setSize = (blockSize: number) => {
    this.xSize = blockSize;
    this.ySize = blockSize;
  };

  /** 블록 위치 설정 */
  public setPos = ({ xPos, yPos }: { xPos: number; yPos: number }) => {
    this.xPos = xPos;
    this.yPos = yPos;
  };

  /** 블록 이미지 설정 */
  public setImage = (blockType: number) => {
    if (blockType < this._frameLoaded.length) {
      this._currentFrame = this._frameLoaded[blockType];
    }
  };
}

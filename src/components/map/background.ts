"use client";

export default class Background {
  // 화면 크기 및 배경화면 크기
  private _xSize;
  private _ySize;

  // 현재 프레임
  private _currentFrame: HTMLImageElement | null = null;

  /** 생성자 */
  public constructor({
    imageName,
    xSize,
    ySize,
  }: {
    imageName: string;
    xSize: number;
    ySize: number;
  }) {
    const imageSrc = `/image/map/background/${imageName}.webp`;
    const image = new Image();
    image.src = imageSrc;
    this._currentFrame = image;

    this._xSize = xSize;
    this._ySize = ySize;
  }

  /** 배경화면 렌더링 */
  public render(context: CanvasRenderingContext2D) {
    if (this._currentFrame) {
      context.drawImage(this._currentFrame, 0, 0, this._xSize, this._ySize);
    }
  }
}

interface QRCode {
  addData(data: string, mode?: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
  createSvgTag(
    cellSize?: number | {
      cellSize?: number;
      margin?: number;
      scalable?: boolean;
      alt?: string | object;
      title?: string | object;
    },
    margin?: number,
    alt?: string | object,
    title?: string | object
  ): string;
  createDataURL(cellSize?: number, margin?: number): string;
  createImgTag(cellSize?: number, margin?: number, alt?: string): string;
}

interface QRCodeFactory {
  (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QRCode;
  stringToBytes(s: string): number[];
}

declare const qrcode: QRCodeFactory;
export = qrcode;

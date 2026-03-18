declare module "qrcode" {
  export type QRCodeErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  export type QRCodeToDataURLOptions = {
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    margin?: number;
    width?: number;
    type?: "image/png" | "image/jpeg" | "image/webp";
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export type QRCodeToStringOptions = {
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    margin?: number;
    width?: number;
    type?: "svg" | "utf8";
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toString: typeof toString;
  };

  export default QRCode;
}

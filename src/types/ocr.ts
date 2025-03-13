export interface OCRSection<T = string> {
    key: string;
    value: T;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Rectangle {
    // For UI display (pixels)
    display: { x: number; y: number; width: number; height: number };
    // Normalized values (0 to 1) relative to the image's natural dimensions
    normalized: { x: number; y: number; width: number; height: number };
    label?: string;
}

export interface Template<T = Rectangle> {
    name: string;
    rectangles: T[];
    // Optional anchor for alignment purposes
    anchor?: { x: number; y: number } | null;
}

export enum Mode {
    Automatic = "automatic",
    Manual = "manual",
}

export enum Provider {
  Tesseract = "tesseract",
  EasyOCR = "easyocr",
}

export interface OCRConfiguration {
  parameters: { [key: string]: string };
  supportedModes: Mode[];
}

export interface OCRProvider {
  onConfigurationChange: (config: OCRConfiguration) => void;
}
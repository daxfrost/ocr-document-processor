export interface OCRSection {
    key: string;
    value: string;
  }
  
  export interface Rectangle {
    // For UI display (pixels)
    display: { x: number; y: number; width: number; height: number };
    // Normalized values (0 to 1) relative to the image's natural dimensions
    normalized: { x: number; y: number; width: number; height: number };
    label?: string;
  }
  
  export interface Template {
    name: string;
    rectangles: Rectangle[];
    // Optional anchor for alignment purposes
    anchor?: { x: number; y: number } | null;
  }
  
import { NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import { OCRSection, Rectangle } from "@/types/ocr";

export const config = {
  api: { bodyParser: true },
};

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Uploaded file is not valid" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const psmMode = formData.get("psmMode") || "3"; // Default to mode 3 if not provided
    const naturalWidth = parseInt(formData.get("naturalWidth") as string);
    const naturalHeight = parseInt(formData.get("naturalHeight") as string);

    let rectangles: Array<Rectangle> = [];
    const rectanglesString = formData.get("rectangles");
    if (rectanglesString) {
      rectangles = JSON.parse(rectanglesString as string);
    }

    const worker = await createWorker("eng", undefined, {
      logger: (m) => console.log("Manual OCR:", m),
    });

    await worker.setParameters({ tessedit_pageseg_mode: psmMode as PSM });
    const sections: OCRSection[] = [];

    for (const [index, rect] of rectangles.entries()) {
      const actualRect = {
        left: rect.normalized.x * naturalWidth,
        top: rect.normalized.y * naturalHeight,
        width: rect.normalized.width * naturalWidth,
        height: rect.normalized.height * naturalHeight,
      };

      const { data } = await worker.recognize(buffer, { rectangle: actualRect }, { blocks: true, box: true, layoutBlocks: true });

      const block = data.blocks && data.blocks[0];
      if (block) {
        sections.push({
          key: rect.label ?? `Section ${index + 1}`,
          value: block.text,
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0,
        });
      } else {
        sections.push({
          key: rect.label ?? `Section ${index + 1}`,
          value: "No text found",
          x: actualRect.left,
          y: actualRect.top,
          width: actualRect.width,
          height: actualRect.height,
        });
      }
    }

    await worker.terminate();
    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
};

import { NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import { OCRSection } from "@/types/ocr";

export const config = {
  api: { bodyParser: true },
};

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const psmMode = formData.get("psmMode");

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const worker = await createWorker("eng", undefined, {
      logger: (m) => console.log("Automatic OCR:", m),
    });
    
    await worker.setParameters({ tessedit_pageseg_mode: psmMode as PSM });
    const { data } = await worker.recognize(buffer, {}, { blocks: true, box: true, layoutBlocks: true });
    await worker.terminate();

    const sections: OCRSection[] = data.blocks && data.blocks.length > 0 
      ? data.blocks.map((block: Tesseract.Block, index: number) => ({
          key: `Section ${index + 1}`,
          value: block.text,
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0,
        }))
      : [];

    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
};

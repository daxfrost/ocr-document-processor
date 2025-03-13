import { NextResponse } from "next/server";
import { EasyOCR } from 'node-easyocr';
import { OCRSection } from "@/types/ocr";

const fs = require('fs');
const os = require('os');
const path = require('path');

export const config = {
  api: { bodyParser: true },
};

const ocr = new EasyOCR();

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Uploaded file is not valid" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const tempDir = os.tmpdir();
    const tempFileName = `${Date.now()}-${file.name}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, buffer);

    await ocr.init(["en"]);
    const result = await ocr.readText(tempFilePath);

    const sections: OCRSection[] = result && result.length > 0 
      ? result.map((block, index) => ({
          key: `Section ${index + 1}`,
          value: block.text,
          x: block.bbox[0][0],
          y: block.bbox[0][1],
          width: block.bbox[1][0] - block.bbox[0][0],
          height: block.bbox[3][1] - block.bbox[1][1],
        }))
      : 
      [];

    await ocr.close();

    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
};

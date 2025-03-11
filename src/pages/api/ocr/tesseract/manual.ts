// src/pages/api/ocr/tesseract/manual.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { createWorker, PSM } from "tesseract.js";
import { OCRSection, Rectangle } from "@/types/ocr";

export const config = {
  api: { bodyParser: false },
};

const handler = async (
  req: NextApiRequest, 
  res: NextApiResponse<{ sections: OCRSection[] } | { error: string }>
) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Error parsing form data" });
    }
    const file = files.file && files.file.length > 0 ? files.file[0] : undefined;
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    const psmMode = fields.psmMode ? fields.psmMode.toString() : "3";
    let rectangles: Array<Rectangle> = [];
    try {
      const rectanglesString = Array.isArray(fields.rectangles) ? fields.rectangles[0] : fields.rectangles;
      rectangles = JSON.parse(rectanglesString as string);
    } catch (parseError) {
      console.error("Error parsing rectangles JSON:", parseError);
      return res.status(400).json({ error: "Invalid rectangles JSON" });
    }
    let naturalWidth = 0;
    let naturalHeight = 0;
    try {
      const naturalWidthString = Array.isArray(fields.naturalWidth) ? fields.naturalWidth[0] : fields.naturalWidth;
      const naturalHeightString = Array.isArray(fields.naturalHeight) ? fields.naturalHeight[0] : fields.naturalHeight;
      if (!naturalWidthString || !naturalHeightString || naturalHeightString.length < 1 || naturalWidthString.length < 1) {
        console.error("Missing image dimensions:", "naturalWidthString: " + naturalWidthString + "naturalHeightString:" + naturalHeightString);
        return res.status(400).json({ error: "Missing image dimensions" });
      }
      naturalWidth = parseInt(naturalWidthString as string, 10);
      naturalHeight = parseInt(naturalHeightString as string, 10);
    } catch (parseError) {
      console.error("Missing image dimensions:", parseError);
      return res.status(400).json({ error: "Missing image dimensions" });
    }

    const sections: OCRSection[] = [];
    for (const [index, rect] of rectangles.entries()) {
      const actualRect = {
        left: rect.normalized.x * naturalWidth,
        top: rect.normalized.y * naturalHeight,
        width: rect.normalized.width * naturalWidth,
        height: rect.normalized.height * naturalHeight,
      };

      try {
        const worker = await createWorker("eng", undefined, {
          logger: (m) => console.log(`Manual OCR for section ${rect.label ?? `Section ${index + 1}`}:`, m),
        });
        await worker.setParameters({ tessedit_pageseg_mode: psmMode as PSM });
        const { data } = await worker.recognize(file.filepath, { rectangle: actualRect }, { blocks: true, box: true, layoutBlocks: true });
        await worker.terminate();

        // Extract the bounding box from the OCR data
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
      } catch (ocrError) {
        console.error(`Error processing section ${rect.label ?? `Section ${index + 1}`}:`, ocrError);
        sections.push({
          key: `Section ${index + 1}`,
          value: "Error during OCR",
          x: actualRect.left,
          y: actualRect.top,
          width: actualRect.width,
          height: actualRect.height,
        });
      }
    }
    return res.status(200).json({ sections });
  });
};

export default handler;

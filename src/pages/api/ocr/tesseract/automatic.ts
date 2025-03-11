// src/pages/api/ocr/tesseract/automatic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { createWorker, PSM } from "tesseract.js";
import { OCRSection } from "../../../../types/ocr"

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
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Error parsing form data" });
    }
    const file = files.file && files.file.length > 0 ? files.file[0] : undefined;
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    const psmMode = fields.psmMode ? fields.psmMode.toString() : "3";

    try {
      const worker = await createWorker("eng", undefined, {
        logger: (m) => console.log("Automatic OCR:", m),
      });
      await worker.setParameters({ tessedit_pageseg_mode: psmMode as PSM });
      const { data } = await worker.recognize(file.filepath, {}, { blocks: true, box: true, layoutBlocks: true });
      await worker.terminate();

      // Check if data.blocks is null or empty, and return an empty sections array if so.
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

      return res.status(200).json({ sections });
    } catch (error) {
      console.error("OCR error:", error);
      return res.status(500).json({ error: "OCR processing failed" });
    }
  });
};

export default handler;

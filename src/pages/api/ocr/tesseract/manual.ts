// src/pages/api/ocr/tesseract/manual.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { createWorker } from "tesseract.js";

export const config = {
  api: { bodyParser: false },
};

interface Section {
  key: string;
  value: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<Section[] | { error: string }>) => {
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
    let rectangles: Array<{ x: number; y: number; width: number; height: number }> = [];
    try {
      rectangles = JSON.parse(fields.rectangles as string);
    } catch (parseError) {
      console.error("Error parsing rectangles JSON:", parseError);
      return res.status(400).json({ error: "Invalid rectangles JSON" });
    }
    const naturalWidth = parseInt(fields.naturalWidth as string, 10);
    const naturalHeight = parseInt(fields.naturalHeight as string, 10);
    if (!naturalWidth || !naturalHeight) {
      return res.status(400).json({ error: "Missing image dimensions" });
    }

    const sections: Section[] = [];
    for (const [index, rect] of rectangles.entries()) {
      const actualRect = {
        left: rect.x * naturalWidth,
        top: rect.y * naturalHeight,
        width: rect.width * naturalWidth,
        height: rect.height * naturalHeight,
      };

      try {
        const worker = await createWorker("eng", undefined, {
          logger: (m) => console.log(`Manual OCR for section ${index + 1}:`, m),
        });
        await worker.setParameters({ tessedit_pageseg_mode: psmMode });
        const { data } = await worker.recognize(file.filepath, { rectangle: actualRect }, { blocks: true, box: true, layoutBlocks: true });
        await worker.terminate();
        sections.push({
          key: `Section ${index + 1}`,
          value: data.text,
        });
      } catch (ocrError) {
        console.error(`Error processing section ${index + 1}:`, ocrError);
        sections.push({
          key: `Section ${index + 1}`,
          value: "Error during OCR",
        });
      }
    }
    return res.status(200).json({ sections });
  });
};

export default handler;

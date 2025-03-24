import { NextResponse } from "next/server";
import { predict } from './../../../lib/tensor/predict.mjs'; // Import the classifyImage function

const fs = require('fs');
const os = require('os');
const path = require('path');

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
    
    const tempDir = os.tmpdir();
    const tempFileName = `${Date.now()}-${file.name}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    fs.writeFileSync(tempFilePath, buffer);

    let result = await predict(tempFilePath);
    const predictedClassMatch = result.match(/Predicted class:\s*(.*)/);
    if (predictedClassMatch && predictedClassMatch[1]) {
      result = predictedClassMatch[1];
    } else {
      result = "Unknown";
    }

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
};

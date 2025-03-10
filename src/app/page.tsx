// src/app/page.tsx
"use client"

import Link from "next/link";

const HomePage: React.FC = () => {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>OCR Testing Project</h1>
      <p>Select an OCR tool to test:</p>
      <ul>
        <li>
          <Link href="/ocr/tesseract">Tesseract OCR</Link>
        </li>
        <li>
          <Link href="/ocr/easyocr">EasyOCR (Coming Soon)</Link>
        </li>
      </ul>
    </div>
  );
};

export default HomePage;

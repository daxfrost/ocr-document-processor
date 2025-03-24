# OCR Document Processor

## Overview

**OCR Document Processor** is a Next.js application designed to showcase two distinct OCR extraction approaches using different OCR libraries with abstractions that ultimately takes the data extracted, stores it, and further processes it with AI & ML to understand optimizations. Currently **Tesseract** and **EasyOCR** are implemented, but many others are on the list:

- Surya (local)
- DocTR (via Roboflow Hosted API)
- OpenAI GPT-4 with Vision
- Google Gemini Pro 1.0
- Google Gemini Pro 1.5
- Anthropic Claude 3 Opus
- Hugging Face Idefics2

The application demonstrates two modes for each OCR tool:

1. **Automatic Extraction:**  
   The backend automatically detects text regions from a document and extracts key–value pairs. The API returns both the extracted data and the bounding boxes (rectangles) so that the frontend can overlay them on the document image for review.

2. **Manual Extraction:**  
   The user manually draws rectangle sections over an uploaded document image. These user-defined regions (with labels) are sent to the backend API for targeted OCR processing. The API then returns key–value pairs using the provided labels.

OCR libraries are integrated via backend API routes, ensuring that heavy OCR processing occurs server-side while the frontend handles image upload, region selection, and display that supports resizing and natural positioning calculations for rendering and data extraction. Shared TypeScript interfaces are used across the application for consistency.

## OCR Demo

https://github.com/user-attachments/assets/9f2044ec-6acf-495e-8318-0709b7997b3b

## TensorFlow Model

https://github.com/user-attachments/assets/76da459c-d8e6-46ba-ade4-24d9284560a2

## Goals and Design Decisions

- **Separation of Concerns:**  
  - **Frontend:** Built using the Next.js App Router (in `src/app`) for rendering pages and UI components.
  - **Backend:** OCR processing is handled by API routes (in `src/pages/api`), where heavy processing runs on Node.js.

- **Multiple OCR Libraries:**  
  - **Tesseract:** Supports both automatic and manual extraction modes, offering flexibility for standardized documents as well as for documents requiring precise region extraction.
  - **EasyOCR (Forked):** Uses a custom fork of EasyOCR to support larger, complex JSON payloads and currently supports only automatic extraction.

- **Dual Extraction Modes:**  
  - **Automatic Mode:** The API processes the entire document using built-in block detection and returns both the OCR text and the corresponding bounding boxes. These bounding boxes are rendered as overlays for visual verification.
  - **Manual Mode:** Users draw rectangle sections on the document image. A transparent overlay captures mouse events so that users can draw without the image interfering. A live blue outline displays the region being drawn, and once the user finishes, they’re prompted for a label. This label is then passed to the backend, which returns key–value pairs using the provided label.

- **API-Driven Architecture:**  
  By decoupling OCR processing into API endpoints, the application mimics a production-grade system that can easily be extended to support additional OCR libraries or processing options.

- **Shared Interfaces and Consistency:**  
  Shared TypeScript interfaces (located in `src/types/ocr.ts`) define the structures for OCR sections, rectangles, and templates, ensuring consistency between the frontend and backend.

## Directory Structure

```bash
src/
 ├── app/
 │    ├── page.tsx                   // Homepage with links to OCR tool pages
 │    └── ocr/
 │         ├── tesseract.tsx         // Tesseract OCR page (supports automatic & manual modes)
 │         └── easyocr.tsx           // EasyOCR page (automatic mode only via forked version)
 ├── pages/
 │    └── api/
 │         └── ocr/
 │              ├── tesseract/
 │              │     ├── automatic.ts   // API route for automatic Tesseract OCR
 │              │     └── manual.ts      // API route for manual Tesseract OCR (using predefined rectangles)
 │              └── easyocr/
 │                    ├── automatic.ts   // API route for automatic EasyOCR (forked version)
 │                    └── manual.ts      // API route for manual EasyOCR (stub or not implemented)
 └── types/
      └── ocr.ts                    // Shared TypeScript interfaces
 └── lib/
      └── tensor/
           └── predict.mjs          // TensorFlow model prediction Python interface (Node.js)
           └── predict.py          // TensorFlow model prediction (Python)
           └── train.py            // TensorFlow model training (Python)
```

## Installation & Usage

1. **Clone the Repository:**
```bash
git clone https://github.com/daxfrost/ocr-document-processor.git
cd ocr-document-processor
```

2. **Install Dependencies:**

```bash
npm install
npm run setup-easyocr
```

3. **Train TensorFlow Model:**

```bash
cd lib/tensor
python3 train.py
```

4. **Run Development Server:**

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage:
- **Homepage:**  
  Navigate to the homepage to choose the OCR tool you want to test (Tesseract or EasyOCR).

- **Tesseract OCR Page:**  
  - **Automatic Mode:**  
    Upload a document and click "Process Document Automatically." The backend automatically detects text regions and returns extracted key–value pairs along with the detected bounding boxes. The frontend overlays these bounding boxes on the image for review.
    
  - **Manual Mode:**  
    Upload a document and switch to manual mode. You can drag to create extraction rectangles over the image. A transparent overlay captures mouse events (so the image itself won’t be draggable) and displays a live blue outline during the drag. When you release the mouse, you’re prompted to enter a label. These regions (with normalized coordinates and labels) are then sent to the backend API, which returns extracted key–value pairs using your labels.

- **EasyOCR Page:**  
  The EasyOCR page supports automatic extraction using your forked version of EasyOCR, which is optimized for handling large, complex JSON payloads.

## API Endpoints

- **Tesseract OCR:**
  - **Automatic:**  
    `POST /api/ocr/tesseract/automatic`  
    Processes the full image and returns extracted sections (key–value pairs) along with the detected bounding boxes.
  - **Manual:**  
    `POST /api/ocr/tesseract/manual`  
    Accepts user-defined rectangle sections (with normalized coordinates and labels) plus image dimensions, and returns extracted sections using the provided labels.

- **EasyOCR (Forked):**
  - **Automatic:**  
    `POST /api/ocr/easyocr/automatic`  
    Processes the full image using the forked EasyOCR that supports large, complex JSON payloads.
  - **Manual:**  
    `POST /api/ocr/easyocr/manual`  
    (Currently a stub; manual extraction for EasyOCR may be implemented in the future.)

## Future Enhancements

- **Enhance with AI & ML:**  
  The goal ultimately is to take the data extracted, store it, and further process it with AI & ML to understand optimizations.
- **Enhanced Template Management:**  
  Expand functionality to save, load, and edit predefined extraction templates that recognize similar documents based on image detection with libraries like OpenCV.
- **Refinement & Alignment:**  
  Implement advanced layout analysis and anchoring techniques to improve extraction accuracy.
- **Additional OCR Libraries:**  
  Further integrate other OCR libraries or custom processing pipelines.
- **EasyOCR Manual Mode:**  
  Extend the forked EasyOCR implementation to support manual extraction if needed.

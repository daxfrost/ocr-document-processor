"use client"

import { useState, useRef, useEffect } from "react";
import { Rectangle, Template, OCRSection } from "../../types/ocr"; // Assume shared types are defined here

type Mode = "automatic" | "manual";

const TesseractPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>("automatic");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [psmMode, setPsmMode] = useState<string>("3");
  const [ocrSections, setOcrSections] = useState<OCRSection[]>([]);
  // For manual mode: user-drawn rectangles.
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [originalTemplateRectangles, setOriginalTemplateRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // (Optional states for template anchors, etc. not shown here)

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("documentTemplates");
    if (saved) {
      try {
        // Load templates as needed.
      } catch (err) {
        console.error("Error parsing saved templates", err);
      }
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
        setRectangles([]);
        setOriginalTemplateRectangles([]);
        setOcrSections([]);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Manual Drawing Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== "manual") return;
    // Since the overlay covers the image, we attach events to that overlay.
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setCurrentRect({ x: startX, y: startY, width: 0, height: 0 });
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode !== "manual" || !dragging || !currentRect || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    setCurrentRect({
      x: Math.min(currentRect.x, currentX),
      y: Math.min(currentRect.y, currentY),
      width: Math.abs(currentX - currentRect.x),
      height: Math.abs(currentY - currentRect.y),
    });
  };

  const handleMouseUp = () => {
    if (mode !== "manual" || !dragging || !currentRect || !imageRef.current || !imageContainerRef.current) return;
    setDragging(false);
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgEl = imageRef.current;
    const scaleX = imgEl.naturalWidth / containerRect.width;
    const scaleY = imgEl.naturalHeight / containerRect.height;
    const normalizedRect = {
      x: (currentRect.x * scaleX) / imgEl.naturalWidth,
      y: (currentRect.y * scaleY) / imgEl.naturalHeight,
      width: (currentRect.width * scaleX) / imgEl.naturalWidth,
      height: (currentRect.height * scaleY) / imgEl.naturalHeight,
    };
    const label = window.prompt("Enter label for this section", "") || "Unnamed Section";
    const newRect: Rectangle = { display: currentRect, normalized: normalizedRect, label };
    setRectangles((prev) => [...prev, newRect]);
    setOriginalTemplateRectangles((prev) => [...prev, newRect]);
    setCurrentRect(null);
  };

  // Render overlays for manual rectangles plus the live drag rectangle.
  const renderManualOverlays = () => {
    if (!rectangles || !imageRef.current || !imageContainerRef.current) return null;
    return (
      <>
        {rectangles.map((rect, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: rect.display.x,
              top: rect.display.y,
              width: rect.display.width,
              height: rect.display.height,
              border: "2px dashed red",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              const newLabel = window.prompt("Edit label for this section", rect.label || "");
              if (newLabel !== null) {
                setRectangles((prev) => {
                  const updated = [...prev];
                  updated[idx].label = newLabel || "Unnamed Section";
                  return updated;
                });
                setOriginalTemplateRectangles((prev) => {
                  const updated = [...prev];
                  updated[idx].label = newLabel || "Unnamed Section";
                  return updated;
                });
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {rect.label && (
              <div
                style={{
                  position: "absolute",
                  top: -24,
                  left: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  color: "#fff",
                  padding: "4px 8px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span>{rect.label}</span>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this section?")) {
                      setRectangles((prev) => prev.filter((_, i) => i !== idx));
                      setOriginalTemplateRectangles((prev) => prev.filter((_, i) => i !== idx));
                    }
                  }}
                  style={{
                    marginLeft: "4px",
                    background: "red",
                    border: "none",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    lineHeight: "18px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
        {currentRect && (
          <div
            style={{
              position: "absolute",
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              border: "2px dashed blue",
              pointerEvents: "none",
            }}
          />
        )}
      </>
    );
  };

  // API-based manual extraction.
  const handleManualExtraction = async () => {
    if (!selectedFile) {
      alert("Please upload a document first.");
      return;
    }
    if (rectangles.length === 0) {
      alert("Please define at least one rectangle for extraction.");
      return;
    }
    setLoading(true);
    setOcrSections([]);
    const naturalWidth = imageRef.current?.naturalWidth;
    const naturalHeight = imageRef.current?.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      alert("Could not determine image dimensions.");
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("psmMode", psmMode);
    formData.append("rectangles", JSON.stringify(rectangles.map(rect => rect.normalized)));
    formData.append("naturalWidth", naturalWidth.toString());
    formData.append("naturalHeight", naturalHeight.toString());
    
    try {
      const response = await fetch("/api/ocr/tesseract/manual", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        // Expected data: { sections: Array<{ key, value }> }
        setOcrSections(data.sections);
      }
    } catch (error) {
      console.error("API error:", error);
      alert("Error processing OCR via API.");
    }
    setLoading(false);
  };

  // API-based automatic extraction.
  const handleAutomaticExtraction = async () => {
    if (!selectedFile) {
      alert("Please upload a document first.");
      return;
    }
    setLoading(true);
    setOcrSections([]);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("psmMode", psmMode);
    const response = await fetch("/api/ocr/tesseract/automatic", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setOcrSections(data.sections);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Tesseract OCR Testing</h1>
      <nav style={{ marginBottom: "1rem" }}>
        <button onClick={() => setMode("automatic")}>Automatic Extraction</button>
        <button onClick={() => setMode("manual")}>Manual Extraction</button>
      </nav>
      <div style={{ marginTop: "1rem" }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      {imagePreviewUrl && (
        <div style={{ marginTop: "1rem", position: "relative" }} ref={imageContainerRef}>
          <img
            ref={imageRef}
            src={imagePreviewUrl}
            alt="Uploaded document"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            // In manual mode, the image no longer receives pointer events.
            style={{ display: "block", maxWidth: "100%", height: "auto", pointerEvents: mode === "manual" ? "none" : "auto" }}
          />
          {/* In manual mode, render an overlay div that covers the entire image to capture mouse events */}
          {mode === "manual" && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                cursor: "crosshair",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {renderManualOverlays()}
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: "1rem" }}>
        <label>Page Segmentation Mode: </label>
        <select value={psmMode} onChange={(e) => setPsmMode(e.target.value)}>
          <option value="0">0 - OSD only</option>
          <option value="1">1 - Auto segmentation with OSD</option>
          <option value="3">3 - Fully automatic segmentation, no OSD</option>
          <option value="4">4 - Assume a single column of text</option>
          <option value="6">6 - Assume a single uniform block of text</option>
          <option value="7">7 - Treat image as a single text line</option>
          <option value="8">8 - Treat image as a single word</option>
          <option value="10">10 - Treat image as a single character</option>
        </select>
      </div>
      {mode === "automatic" && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleAutomaticExtraction} disabled={loading}>
            {loading ? "Processing OCR via API..." : "Process Document Automatically"}
          </button>
        </div>
      )}
      {mode === "manual" && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleManualExtraction} disabled={loading}>
            {loading ? "Processing OCR via API..." : "Process Document Manually"}
          </button>
        </div>
      )}
      {ocrSections.length > 0 && (
        <div style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Extracted Sections</h2>
          {ocrSections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: "0.5rem" }}>
              <p>
                <strong>{section.key}:</strong> {section.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TesseractPage;

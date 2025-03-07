"use client"

import { useState, useRef, useEffect } from "react";

interface Rectangle {
  // Coordinates for drawing on the screen (in pixels)
  display: { x: number; y: number; width: number; height: number };
  // Normalized coordinates (values between 0 and 1) relative to the document's natural dimensions
  normalized: { x: number; y: number; width: number; height: number };
  label?: string;
}

interface Template {
  name: string;
  rectangles: Rectangle[];
  // Normalized anchor (center of the first detected block) for the template
  anchor?: { x: number; y: number } | null;
}

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sectionData, setSectionData] = useState<Array<{ label: string; text: string }>>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  // The template anchor is the normalized center of the first detected block.
  const [templateAnchor, setTemplateAnchor] = useState<{ x: number; y: number } | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load templates from localStorage on mount.
  useEffect(() => {
    const saved = localStorage.getItem("documentTemplates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
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
        // Reset previous state.
        setRectangles([]);
        setSectionData([]);
        setSelectedTemplateName("");
        setCurrentTemplate(null);
        setTemplateAnchor(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-generate sections from detected text blocks.
  // Also, store the normalized center of the first block as the template anchor.
  const handleAutoGenerateSections = async () => {
    if (!selectedFile || !imageRef.current || !imageContainerRef.current) return;
    setLoading(true);
    const Tesseract = await import("tesseract.js");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", Tesseract.OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(m.progress);
        }
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD });
    // Run OCR with parameters to retrieve blocks.
    const result = await worker.recognize(selectedFile, {}, { blocks: true, box: true, layoutBlocks: true });
    await worker.terminate();

    console.log("OCR Result:", result);

    const blocks = result.data.blocks;
    if (blocks && blocks.length > 0) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const containerRect = imageContainerRef.current.getBoundingClientRect();

      // Use the first block's center as the template anchor.
      const firstBlock = blocks[0];
      const anchorCenter = {
        x: ((firstBlock.bbox.x0 + firstBlock.bbox.x1) / 2) / naturalWidth,
        y: ((firstBlock.bbox.y0 + firstBlock.bbox.y1) / 2) / naturalHeight,
      };
      setTemplateAnchor(anchorCenter);

      // Map blocks to candidate rectangles with initial labels "Section 1", "Section 2", etc.
      const autoRects = blocks.map((block: any, index: number) => {
        const x = block.bbox.x0 / naturalWidth;
        const y = block.bbox.y0 / naturalHeight;
        const width = (block.bbox.x1 - block.bbox.x0) / naturalWidth;
        const height = (block.bbox.y1 - block.bbox.y0) / naturalHeight;
        const displayX = (block.bbox.x0 / naturalWidth) * containerRect.width;
        const displayY = (block.bbox.y0 / naturalHeight) * containerRect.height;
        const displayWidth = ((block.bbox.x1 - block.bbox.x0) / naturalWidth) * containerRect.width;
        const displayHeight = ((block.bbox.y1 - block.bbox.y0) / naturalHeight) * containerRect.height;
        return {
          display: { x: displayX, y: displayY, width: displayWidth, height: displayHeight },
          normalized: { x, y, width, height },
          label: `Section ${index + 1}`
        };
      });
      setRectangles(autoRects);
    } else {
      alert("No text blocks detected.");
    }
    setLoading(false);
  };

  // Function to detect the first block (anchor) in the current document.
  const detectFirstBlockAnchor = async (): Promise<{ x: number; y: number } | null> => {
    if (!selectedFile || !imageRef.current) return null;
    const Tesseract = await import("tesseract.js");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", Tesseract.OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(m.progress);
        }
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD });
    const result = await worker.recognize(selectedFile, {}, { blocks: true, box: true, layoutBlocks: true });
    await worker.terminate();
    const blocks = result.data.blocks;
    if (blocks && blocks.length > 0) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const firstBlock = blocks[0];
      const centerX = (firstBlock.bbox.x0 + firstBlock.bbox.x1) / 2;
      const centerY = (firstBlock.bbox.y0 + firstBlock.bbox.y1) / 2;
      return { x: centerX / naturalWidth, y: centerY / naturalHeight };
    }
    return null;
  };

  // Adjust the overlay rectangles on the current document by detecting the new anchor (first block)
  // and computing the offset compared to the stored template anchor.
  const handleAdjustOverlays = async () => {
    if (!currentTemplate || !currentTemplate.anchor) {
      alert("No template anchor available. Make sure to save a template with auto-detected anchor.");
      return;
    }
    const newAnchor = await detectFirstBlockAnchor();
    if (!newAnchor) {
      alert("Could not detect anchor in the new document.");
      return;
    }
    // Compute offset (normalized difference).
    const offsetX = newAnchor.x - currentTemplate.anchor.x;
    const offsetY = newAnchor.y - currentTemplate.anchor.y;

    // Update each rectangle's normalized coordinates by adding the offset.
    if (!imageRef.current || !imageContainerRef.current) return;
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const adjustedRectangles = rectangles.map((rect) => {
      const newNormalized = {
        x: rect.normalized.x + offsetX,
        y: rect.normalized.y + offsetY,
        width: rect.normalized.width,
        height: rect.normalized.height,
      };
      // Update display coordinates using container dimensions.
      const newDisplay = {
        x: newNormalized.x * containerRect.width,
        y: newNormalized.y * containerRect.height,
        width: newNormalized.width * containerRect.width,
        height: newNormalized.height * containerRect.height,
      };
      return { ...rect, normalized: newNormalized, display: newDisplay };
    });
    setRectangles(adjustedRectangles);
  };

  // Process the document using the (possibly adjusted) normalized rectangles.
  const handleProcessDocument = async () => {
    if (!selectedFile) return;
    if (rectangles.length === 0) {
      alert("Please define at least one section rectangle first.");
      return;
    }
    setLoading(true);
    setProgress(0);
    setSectionData([]);

    const Tesseract = await import("tesseract.js");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", Tesseract.OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(m.progress);
        }
      },
    });
    const imgEl = imageRef.current;
    if (!imgEl) return;
    const naturalWidth = imgEl.naturalWidth;
    const naturalHeight = imgEl.naturalHeight;

    const sections: Array<{ label: string; text: string }> = [];
    for (const rect of rectangles) {
      const actualRect = {
        left: rect.normalized.x * naturalWidth,
        top: rect.normalized.y * naturalHeight,
        width: rect.normalized.width * naturalWidth,
        height: rect.normalized.height * naturalHeight,
      };
      const { data } = await worker.recognize(selectedFile, { rectangle: actualRect });
      sections.push({
        label: rect.label || "Unnamed Section",
        text: data.text,
      });
    }
    await worker.terminate();
    setSectionData(sections);
    setLoading(false);
  };

  // Save the current template (including the stored anchor) to localStorage.
  const handleSaveTemplate = () => {
    if (rectangles.length === 0) {
      alert("Define at least one section before saving a template.");
      return;
    }
    const name = window.prompt("Enter a name for this document template", "");
    if (!name) return;
    const newTemplate: Template = { name, rectangles, anchor: templateAnchor };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem("documentTemplates", JSON.stringify(updatedTemplates));
    alert(`Template "${name}" saved.`);
  };

  // Load a template.
  const handleLoadTemplate = () => {
    const template = templates.find((t) => t.name === selectedTemplateName);
    if (template) {
      setRectangles(template.rectangles);
      setCurrentTemplate(template);
      if (template.anchor) {
        setTemplateAnchor(template.anchor);
      } else {
        setTemplateAnchor(null);
      }
    } else {
      alert("Selected template not found.");
    }
  };

  // Manual drawing of rectangles.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== imageContainerRef.current && e.target !== imageRef.current) return;
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setCurrentRect({ x: startX, y: startY, width: 0, height: 0 });
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !currentRect || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const newRect = {
      x: Math.min(currentRect.x, currentX),
      y: Math.min(currentRect.y, currentY),
      width: Math.abs(currentX - currentRect.x),
      height: Math.abs(currentY - currentRect.y),
    };
    setCurrentRect(newRect);
  };

  const handleMouseUp = () => {
    if (!dragging || !currentRect || !imageRef.current || !imageContainerRef.current) return;
    setDragging(false);
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgEl = imageRef.current;
    const scaleX = imgEl.naturalWidth / containerRect.width;
    const scaleY = imgEl.naturalHeight / containerRect.height;
    const actualRect = {
      x: currentRect.x * scaleX,
      y: currentRect.y * scaleY,
      width: currentRect.width * scaleX,
      height: currentRect.height * scaleY,
    };
    const normalizedRect = {
      x: actualRect.x / imgEl.naturalWidth,
      y: actualRect.y / imgEl.naturalHeight,
      width: actualRect.width / imgEl.naturalWidth,
      height: actualRect.height / imgEl.naturalHeight,
    };
    const label = window.prompt("Enter label for this section", "");
    setRectangles((prev) => [
      ...prev,
      { display: currentRect, normalized: normalizedRect, label: label || "Unnamed Section" },
    ]);
    setCurrentRect(null);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Freight Document OCR Processing</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />

      {imagePreviewUrl && (
        <>
          <div style={{ marginTop: "1rem" }}>
            <h2>Document Preview & Template Definition</h2>
            <div
              ref={imageContainerRef}
              style={{ position: "relative", display: "inline-block", cursor: "crosshair" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imagePreviewUrl}
                alt="Document preview"
                draggable={false}
                style={{ display: "block", maxWidth: "100%", height: "auto" }}
              />
              {/* Render overlays for each rectangle */}
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
                  }}
                />
              )}
            </div>
          </div>

          {/* Auto Generate Sections UI */}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleAutoGenerateSections} disabled={loading}>
              {loading ? "Processing OCR..." : "Auto Generate Sections"}
            </button>
          </div>

          {/* Adjust Overlays UI */}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleAdjustOverlays} disabled={loading || !currentTemplate || !currentTemplate.anchor}>
              Adjust Overlays for Anchor Offset
            </button>
          </div>

          {/* Save and Load Template UI */}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleSaveTemplate}>Save Template</button>
            {templates.length > 0 && (
              <span style={{ marginLeft: "1rem" }}>
                <label htmlFor="templateSelect">Load Template: </label>
                <select
                  id="templateSelect"
                  value={selectedTemplateName}
                  onChange={(e) => setSelectedTemplateName(e.target.value)}
                >
                  <option value="">Select a template</option>
                  {templates.map((temp, idx) => (
                    <option key={idx} value={temp.name}>
                      {temp.name}
                    </option>
                  ))}
                </select>
                <button onClick={handleLoadTemplate} style={{ marginLeft: "0.5rem" }}>
                  Load
                </button>
              </span>
            )}
          </div>
        </>
      )}

      {selectedFile && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleProcessDocument} disabled={loading}>
            {loading ? "Processing..." : "Process Document"}
          </button>
          {loading && <p>Processing: {(progress * 100).toFixed(2)}%</p>}
        </div>
      )}

      {sectionData.length > 0 && (
        <div style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Extracted Sections</h2>
          {sectionData.map((section, idx) => (
            <div key={idx}>
              <p>
                <strong>{section.label}:</strong>
              </p>
              <pre
                style={{
                  backgroundColor: "#333",
                  color: "#fff",
                  padding: "8px",
                  borderRadius: "4px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {section.text}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;

"use client"

import { useState, useRef, useEffect } from "react";

interface Rectangle {
  // Coordinates relative to the displayed image (for overlay drawing)
  display: { x: number; y: number; width: number; height: number };
  // Coordinates relative to the actual image pixels
  actual: { x: number; y: number; width: number; height: number };
  // Label for the defined section
  label?: string;
}

interface Template {
  name: string;
  rectangles: Rectangle[];
}

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Holds the OCR results for each defined section
  const [sectionData, setSectionData] = useState<Array<{ label: string; text: string }>>([]);
  // Saved templates from localStorage
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");

  // Refs for image container and image elements
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load templates from localStorage on mount
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
        // Reset any previous rectangles, section data, and selected template.
        setRectangles([]);
        setSectionData([]);
        setSelectedTemplateName("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Save the current set of rectangles as a template in localStorage
  const handleSaveTemplate = () => {
    if (rectangles.length === 0) {
      alert("Define at least one section before saving a template.");
      return;
    }
    const name = window.prompt("Enter a name for this document template", "");
    if (!name) return;
    const newTemplate: Template = { name, rectangles };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem("documentTemplates", JSON.stringify(updatedTemplates));
    alert(`Template "${name}" saved.`);
  };

  // Load the selected template and update the overlays
  const handleLoadTemplate = () => {
    const template = templates.find((t) => t.name === selectedTemplateName);
    if (template) {
      setRectangles(template.rectangles);
    } else {
      alert("Selected template not found.");
    }
  };

  // Process the image by iterating over all defined rectangles
  const handleProcessDocument = async () => {
    if (!selectedFile) return;
    if (rectangles.length === 0) {
      alert("Please define at least one section rectangle first.");
      return;
    }
    setLoading(true);
    setProgress(0);
    setSectionData([]); // Reset previous results

    // Dynamically import Tesseract.js and create a worker
    const Tesseract = await import("tesseract.js");
    const { createWorker } = await import("tesseract.js");

    const worker = await createWorker("eng", Tesseract.OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(m.progress);
        }
      },
    });

    worker.load();

    const sections: Array<{ label: string; text: string }> = [];
    // Process each rectangle sequentially
    for (const rect of rectangles) {
      const { data } = await worker.recognize(selectedFile, {
        rectangle: {
          left: rect.actual.x,
          top: rect.actual.y,
          width: rect.actual.width,
          height: rect.actual.height,
        },
      });
      sections.push({
        label: rect.label || "Unnamed Section",
        text: data.text,
      });
    }
    await worker.terminate();
    setSectionData(sections);
    setLoading(false);
  };

  // Handler to edit a rectangle's label
  const handleEditRectangle = (index: number) => {
    const newLabel = window.prompt("Enter new label for this section", rectangles[index].label || "");
    if (newLabel !== null) {
      setRectangles((prev) => {
        const updated = [...prev];
        updated[index].label = newLabel || "Unnamed Section";
        return updated;
      });
    }
  };

  // Handler to delete a rectangle
  const handleDeleteRectangle = (index: number) => {
    if (window.confirm("Delete this section?")) {
      setRectangles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handlers for drawing a rectangle on the image.
  // Only start drawing if the click is directly on the container or image.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target !== imageContainerRef.current &&
      e.target !== imageRef.current
    ) {
      // Do not start drawing if clicking on an overlay.
      return;
    }
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
    const label = window.prompt("Enter label for this section", "");
    setRectangles((prev) => [
      ...prev,
      { display: currentRect, actual: actualRect, label: label || "Unnamed Section" },
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
              {/* Render finalized rectangle overlays */}
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
                    e.stopPropagation(); // Prevent parent handlers from firing
                    handleEditRectangle(idx);
                  }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent starting a new rectangle
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
                        onMouseDown={(e) => e.stopPropagation()} // Prevent parent mouseDown
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRectangle(idx);
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
              {/* Render the rectangle currently being drawn */}
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

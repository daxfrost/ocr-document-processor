"use client"

import { useState, useRef, useEffect } from "react";
import { Rectangle, Mode, OCRSection } from "@/types/ocr"; // Assume shared types are defined here

const TesseractPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>("automatic");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
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

  useEffect(() => {
    if (!loading) {
      const extractedSectionsElement = document.querySelector('h2');
      if (extractedSectionsElement && extractedSectionsElement.textContent === 'Extracted Sections') {
        extractedSectionsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loading]);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!imageRef.current || !imageContainerRef.current) return;
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const imgEl = imageRef.current;
      const scaleX = containerRect.width / imgEl.naturalWidth;
      const scaleY = containerRect.height / imgEl.naturalHeight;

      // Update rectangles with new display positions
      setRectangles(prevRectangles => 
        prevRectangles.map(rect => ({
          ...rect,
          display: {
            x: rect.normalized.x * imgEl.naturalWidth * scaleX,
            y: rect.normalized.y * imgEl.naturalHeight * scaleY,
            width: rect.normalized.width * imgEl.naturalWidth * scaleX,
            height: rect.normalized.height * imgEl.naturalHeight * scaleY
          }
        }))
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Render overlays for OCR sections
  const renderOCROverlays = () => {
    if (!ocrSections || !imageRef.current || !imageContainerRef.current) return null;
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgEl = imageRef.current;
    const scaleX = containerRect.width / imgEl.naturalWidth;
    const scaleY = containerRect.height / imgEl.naturalHeight;

    return (
      <>
        {ocrSections.map((section, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: section.x * scaleX,
              top: section.y * scaleY,
              width: section.width * scaleX,
              height: section.height * scaleY,
              border: "2px solid green",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -24,
                left: 0,
                backgroundColor: "rgba(0, 128, 0, 0.8)",
                color: "#fff",
                padding: "4px 8px",
                fontSize: "12px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
            >
              {section.key}
            </div>
          </div>
        ))}
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
    formData.append("rectangles", JSON.stringify(rectangles));
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

  // Add this CSS at the top of your component
  const styles = {
    toggleContainer: {
      display: 'inline-flex',
      backgroundColor: '#f0f0f0',
      padding: '4px',
      borderRadius: '8px',
      gap: '4px'
    },
    toggleButton: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: 500,
      height: '40px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    activeButton: {
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      color: '#000',
    },
    inactiveButton: {
      backgroundColor: 'transparent',
      color: '#666',
    },
    heading: {
      fontSize: '2.5rem',
      fontWeight: '600',
      color: '#2d3748',
      marginBottom: '1.5rem',
      borderBottom: '3px solid #e2e8f0',
      paddingBottom: '0.5rem',
      background: 'linear-gradient(to right, #2d3748, #4a5568)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-0.025em'
    },
    controlsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
      marginBottom: '2rem',
    },
    selectorContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#e2e8f0',
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#fff',
      fontSize: '14px',
      color: '#2d3748',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.2s ease',
      height: '40px',
      '&:hover': {
        borderColor: '#cbd5e0',
      },
      '&:focus': {
        borderColor: '#4a5568',
        boxShadow: '0 0 0 3px rgba(74, 85, 104, 0.1)',
      },
    },
    actionButton: {
      backgroundColor: '#4a5568',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      '&:hover': {
        backgroundColor: '#2d3748',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
      '&:disabled': {
        backgroundColor: '#cbd5e0',
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={styles.heading}>Tesseract</h1>
      
      <div style={styles.controlsContainer}>
        <div style={styles.toggleContainer}>
          <button
            onClick={() => setMode("automatic")}
            style={{
              ...styles.toggleButton,
              ...(mode === "automatic" ? styles.activeButton : styles.inactiveButton),
            }}
          >
            Automatic Extraction
          </button>
          <button
            onClick={() => setMode("manual")}
            style={{
              ...styles.toggleButton,
              ...(mode === "manual" ? styles.activeButton : styles.inactiveButton),
            }}
          >
            Manual Extraction
          </button>
        </div>

        <div style={styles.selectorContainer}>
          <label style={styles.label}>Page Segmentation Mode:</label>
          <select 
            value={psmMode} 
            onChange={(e) => setPsmMode(e.target.value)}
            style={styles.select}
          >
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

        <button 
          onClick={mode === "automatic" ? handleAutomaticExtraction : handleManualExtraction} 
          disabled={loading}
          style={styles.actionButton}
        >
          {loading ? "Processing..." : `Process Document ${mode === "automatic" ? "Automatically" : "Manually"}`}
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          style={{ display: 'none' }} // Hide the default file input
          id="fileInput"
        />
        <button 
          onClick={() => document.getElementById('fileInput')?.click()} 
          style={{
            backgroundColor: '#4a5568',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Upload Document
        </button>
      </div>
      
      {imagePreviewUrl && (
        <div
          style={{
            marginTop: "1rem",
            position: "relative",
            display: "inline-block",
            width: "fit-content",
          }}
          ref={imageContainerRef}
        >
          <img
            ref={imageRef}
            src={imagePreviewUrl}
            alt="Uploaded document"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              display: "block",
              maxWidth: "100%",
              height: "auto",
              pointerEvents: mode === "manual" ? "none" : "auto",
            }}
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
          {/* Render OCR section overlays */}
          {ocrSections.length > 0 && renderOCROverlays()}
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

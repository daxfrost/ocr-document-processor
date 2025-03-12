"use client"

import { useState, useRef, useEffect } from "react";
import { Rectangle, Mode, OCRSection, Template } from "@/types/ocr"; // Assume shared types are defined here
import styled from 'styled-components';
import { useTheme } from 'styled-components';

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.large};
  font-family: ${({ theme }) => theme.fonts.main};
  color: ${({ theme }) => theme.colors.text};
`;

const Heading = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.heading};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  border-bottom: 3px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing.small};
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.buttonText};
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.body};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ theme }) => theme.boxShadow};
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    color: ${({ theme }) => theme.colors.buttonText};
    background-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const TesseractPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>(Mode.Automatic);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [psmMode, setPsmMode] = useState<string>("3");
  const [ocrSections, setOcrSections] = useState<OCRSection<string>[]>([]);
  // For manual mode: user-drawn rectangles.
  const [rectangles, setRectangles] = useState<Rectangle[]>(() => {
    const savedRectangles = localStorage.getItem("manualRectangles");
    return savedRectangles ? JSON.parse(savedRectangles) : [];
  });
  const [originalTemplateRectangles, setOriginalTemplateRectangles] = useState<Rectangle[]>([]);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [templates, setTemplates] = useState<Template<Rectangle>[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // (Optional states for template anchors, etc. not shown here)
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const theme = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem("documentTemplates");
    if (saved) {
      try {
        const parsedTemplates = JSON.parse(saved);
        setTemplates(parsedTemplates);
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

  useEffect(() => {
    localStorage.setItem("manualRectangles", JSON.stringify(rectangles));
  }, [rectangles]);

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
    const file = event.target.files?.[0];
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
    if (mode !== Mode.Manual) return;
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
    if (mode !== Mode.Manual || !dragging || !currentRect || !imageContainerRef.current) return;
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
    if (mode !== Mode.Manual || !dragging || !currentRect || !imageRef.current || !imageContainerRef.current) return;
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
              ...theme.components.manualOverlay,
              left: rect.display.x,
              top: rect.display.y,
              width: rect.display.width,
              height: rect.display.height,
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
                style={theme.components.manualOverlayLabel}
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
                  style={theme.components.manualOverlayButton}
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
              ...theme.components.manualOverlay,
              ...theme.components.manualOverlayDrag,
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
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
              ...theme.components.ocrOverlay,
              left: section.x * scaleX,
              top: section.y * scaleY,
              width: section.width * scaleX,
              height: section.height * scaleY,
            }}
          >
            <div style={theme.components.ocrOverlayLabel}>
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
      const response = await fetch("/api/tesseract/manual", {
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
    const response = await fetch("/api/tesseract/automatic", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setOcrSections(data.sections);
    setLoading(false);
  };

  const handleSaveTemplate = () => {
    const templateName = window.prompt("Enter template name", "");
    if (!templateName) return;
    const newTemplate: Template<Rectangle> = { name: templateName, rectangles };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem("documentTemplates", JSON.stringify(updatedTemplates));
  };

  const handleLoadTemplate = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setRectangles(template.rectangles);
      setOriginalTemplateRectangles(template.rectangles);
      setSelectedTemplate(templateName);
      applyTemplateToImage(template.rectangles);
    }
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;
    if (window.confirm(`Are you sure you want to delete the template "${selectedTemplate}"?`)) {
      const updatedTemplates = templates.filter(t => t.name !== selectedTemplate);
      setTemplates(updatedTemplates);
      localStorage.setItem("documentTemplates", JSON.stringify(updatedTemplates));
      setSelectedTemplate(null);
    }
  };

  const applyTemplateToImage = (templateRectangles: Rectangle[]) => {
    if (!imageRef.current || !imageContainerRef.current) return;
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgEl = imageRef.current;
    const scaleX = containerRect.width / imgEl.naturalWidth;
    const scaleY = containerRect.height / imgEl.naturalHeight;

    const updatedRectangles = templateRectangles.map(rect => ({
      ...rect,
      display: {
        x: rect.normalized.x * imgEl.naturalWidth * scaleX,
        y: rect.normalized.y * imgEl.naturalHeight * scaleY,
        width: rect.normalized.width * imgEl.naturalWidth * scaleX,
        height: rect.normalized.height * imgEl.naturalHeight * scaleY
      }
    }));

    setRectangles(updatedRectangles);
  };

  return (
    <Container>
      <Heading>Tesseract</Heading>
      
      <div style={theme.components.controlsContainer}>
        <div style={theme.components.toggleContainer}>
          <button
            onClick={() => setMode(Mode.Automatic)}
            style={{
              ...theme.components.toggleButton,
              ...(mode === Mode.Automatic ? theme.components.activeButton : theme.components.inactiveButton),
            }}
          >
            Automatic Extraction
          </button>
          <button
            onClick={() => setMode(Mode.Manual)}
            style={{
              ...theme.components.toggleButton,
              ...(mode === Mode.Manual ? theme.components.activeButton : theme.components.inactiveButton),
            }}
          >
            Manual Extraction
          </button>
        </div>

        <div style={theme.components.selectorContainer}>
          <label style={theme.components.label}>Page Segmentation Mode:</label>
          <select 
            value={psmMode} 
            onChange={(e) => setPsmMode(e.target.value)}
            style={theme.components.select}
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

        <Button 
          onClick={mode === Mode.Automatic ? handleAutomaticExtraction : handleManualExtraction} 
          disabled={loading}
        >
          {loading ? "Processing..." : `Process Document ${mode === Mode.Automatic ? "Automatically" : "Manually"}`}
        </Button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
          id="fileInput"
        />
        <Button onClick={() => document.getElementById('fileInput')?.click()}>
          Upload Document
        </Button>

        {mode === Mode.Manual && (
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center" }}>
            <Button onClick={handleSaveTemplate} style={{ marginRight: "1rem" }}>Save Template</Button>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ ...theme.components.label, marginRight: "0.5rem" }}>Load Template:</label>
              <select 
                value={selectedTemplate || ""}
                onChange={(e) => handleLoadTemplate(e.target.value)}
                style={theme.components.select}
              >
                <option value="" disabled>Select a template</option>
                {templates.map((template, idx) => (
                  <option key={idx} value={template.name}>{template.name}</option>
                ))}
              </select>
              {selectedTemplate && (
                <Button onClick={handleDeleteTemplate} style={{ marginLeft: "1rem" }}>
                  Delete Template
                </Button>
              )}
            </div>
          </div>
        )}
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
              pointerEvents: mode === Mode.Manual ? "none" : "auto",
            }}
          />
          {/* In manual mode, render an overlay div that covers the entire image to capture mouse events */}
          {mode === Mode.Manual && (
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
    </Container>
  );
};

export default TesseractPage;

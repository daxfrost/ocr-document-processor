import React, { useState, useEffect } from "react";
import { OCRProvider, OCRConfiguration, Mode } from "@/types/ocr";

const defaultConfig : OCRConfiguration = {
  parameters: {
    psmMode: "3",
  },
  supportedModes: [Mode.Automatic, Mode.Manual],
}

const TesseractProvider: React.FC<OCRProvider> = ({ onConfigurationChange }) => {
  const [localConfig, setLocalConfig] = useState(defaultConfig);

  useEffect(() => {
    onConfigurationChange(defaultConfig);
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newConfig = { ...localConfig, parameters: { ...localConfig.parameters, psmMode: e.target.value }   };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  return (
    <div style={{ marginTop: "1rem", display: "flex", alignItems: "center" }}>
      <label htmlFor="psmMode" style={{ marginRight: "0.5rem" }}>
        Page Segmentation Mode:
      </label>
      <select
        id="psmMode"
        value={localConfig.parameters.psmMode ?? "3"}
        onChange={handleSelectChange}
        style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
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
  );
};

export default TesseractProvider; 
import React, { useState, useEffect } from "react";
import { OCRProvider } from "@/types/ocr";

const defaultConfig = {}

const EasyOCRProvider: React.FC<OCRProvider> = ({ onConfigurationChange }) => {
  const [localConfig, setLocalConfig] = useState(defaultConfig);

  useEffect(() => {
    onConfigurationChange(defaultConfig);
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newConfig = { ...localConfig, psmMode: e.target.value };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  return null;
};

export default EasyOCRProvider; 
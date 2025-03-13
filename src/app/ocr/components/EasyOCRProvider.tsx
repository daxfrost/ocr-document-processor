import React, { useState, useEffect } from "react";
import { OCRProvider, OCRConfiguration, Mode } from "@/types/ocr";

const defaultConfig : OCRConfiguration = {
  parameters: {},
  supportedModes: [Mode.Automatic],
}

const EasyOCRProvider: React.FC<OCRProvider> = ({ onConfigurationChange }) => {
  const [localConfig, setLocalConfig] = useState(defaultConfig);

  useEffect(() => {
    onConfigurationChange(defaultConfig);
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newConfig = { ...localConfig, parameters: { ...localConfig.parameters, psmMode: e.target.value } };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  return null;
};

export default EasyOCRProvider; 
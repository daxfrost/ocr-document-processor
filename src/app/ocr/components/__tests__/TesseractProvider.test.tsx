import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TesseractProvider from '../TesseractProvider';

describe('TesseractProvider Component', () => {
  it('calls onConfigurationChange with default config on mount', () => {
    const mockOnConfigurationChange = jest.fn();
    render(<TesseractProvider onConfigurationChange={mockOnConfigurationChange} />);
    expect(mockOnConfigurationChange).toHaveBeenCalledWith({
      parameters: { psmMode: '3' },
      supportedModes: ['automatic', 'manual'],
    });
  });

  it('updates configuration on select change', () => {
    const mockOnConfigurationChange = jest.fn();
    render(<TesseractProvider onConfigurationChange={mockOnConfigurationChange} />);
    const select = screen.getByLabelText(/Page Segmentation Mode/i);
    fireEvent.change(select, { target: { value: '1' } });
    expect(mockOnConfigurationChange).toHaveBeenCalledWith({
      parameters: { psmMode: '1' },
      supportedModes: ['automatic', 'manual'],
    });
  });
}); 
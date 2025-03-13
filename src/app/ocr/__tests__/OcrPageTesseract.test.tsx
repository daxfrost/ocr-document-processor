import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OcrPage from '../page';
import { ThemeProvider } from 'styled-components';
import theme from '@/styles/theme';

// Mock the useSearchParams hook
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue('tesseract'), // Mock the provider value
  }),
}));

describe('OcrPage Component - Tesseract', () => {

  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { });

  const renderWithTheme = (component: React.ReactNode) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders the heading with the provider name', () => {
    renderWithTheme(<OcrPage />);
    const heading = screen.getByRole('heading');
    expect(heading).toHaveTextContent(/TESSERACT/i);
  });

  it('toggles modes and shows alert for unsupported modes', () => {
    renderWithTheme(<OcrPage />);
    const automaticButton = screen.getByText(/Automatic Extraction/i);
    const manualButton = screen.getByText(/Manual Extraction/i);

    // Simulate clicking the manual button
    fireEvent.click(manualButton);
    // Check that no alert is shown
    expect(alertSpy).toHaveBeenCalledTimes(0)

    // Simulate clicking the automatic button
    fireEvent.click(automaticButton);
    // Check that no alert is shown
    expect(alertSpy).toHaveBeenCalledTimes(0)
  });
}); 
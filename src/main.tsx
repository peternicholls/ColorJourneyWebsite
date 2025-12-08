import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from '@/components/ErrorBoundary';

import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { PresetsExportPage } from '@/pages/PresetsExportPage';
import { APIDocsPage } from '@/pages/APIDocsPage';

 // Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/presets" element={<PresetsExportPage />} />
            <Route path="/docs" element={<APIDocsPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
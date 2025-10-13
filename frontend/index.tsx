import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { TooltipProvider } from './src/context/TooltipContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <TooltipProvider>
    <App />
  </TooltipProvider>
);
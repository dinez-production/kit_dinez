import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { updateManager } from './utils/updateManager'
// Import 100% passive update detector (ZERO automatic calls)
import './utils/passiveUpdateDetector'

// Register Service Worker for PWA with comprehensive update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Initialize update manager
        updateManager.init(registration);
        
        console.log('🚀 PWA Update Manager initialized');
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

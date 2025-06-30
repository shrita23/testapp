import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <GoogleOAuthProvider clientId="782581481336-auu8pou8b4kcq645oal3sh50msjt6dpo.apps.googleusercontent.com">
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </GoogleOAuthProvider>
  );
}

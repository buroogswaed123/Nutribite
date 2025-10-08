// App entry point (hydrates root and mounts Router + App shell)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './app/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
// Mount top-level Router and App (keeps history at the app root)
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

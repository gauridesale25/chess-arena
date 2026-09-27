import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="191985077443-9s7f1r8dk01k9a1umegfnrf2jl13fbk3.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

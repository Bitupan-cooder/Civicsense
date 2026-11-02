import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { routingApi } from '../civicAuth';
import { setLanguagePersister } from '../i18n';
import { showToast } from '../toast';
import { AdminApp } from './AdminApp';
import { getSignedInOfficialId, initAuth } from './console';
import './admin.css';

// civic-auth.js shows its own toasts (password change) through window.showToast.
Object.assign(window, { showToast });

// the English/Assamese choice is saved to the signed-in official's profile (PRD)
setLanguagePersister((lang) => { const id = getSignedInOfficialId(); if (id) routingApi().setPreferredLanguage(id, lang); });
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AdminApp /></BrowserRouter></StrictMode>);
// The session check started on DOMContentLoaded in the old page script; keep that moment.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initAuth());
else initAuth();

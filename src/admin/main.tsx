import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as auth from '../civicAuth';
import { setLanguagePersister } from '../i18n';
import { AdminApp } from './AdminApp';
import { getSignedInOfficialId, initAuth } from './console';
import './admin.css';
import '../workflow.css';
import './console-redesign.css'; // last: the hallmark redesign of the signed-in console


// the English/Assamese choice is saved to the signed-in official's profile (PRD)
setLanguagePersister((lang) => { const id = getSignedInOfficialId(); if (id) auth.setPreferredLanguage(id, lang); });
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AdminApp /></BrowserRouter></StrictMode>);
// The session check started on DOMContentLoaded in the old page script; keep that moment.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initAuth());
else initAuth();

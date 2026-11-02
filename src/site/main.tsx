import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setLanguagePersister } from '../i18n';
import { showToast } from '../toast';
import { SiteApp } from './SiteApp';
import { initAnimations } from './animations.js';
import { initCampusMap } from './campusMap.js';
import { initReportForm } from './reportForm';
import { checkCurrentStudentSession, setReadingLanguage } from './studentSession';
import { initTracker } from './tracker';
import './site.css';

// civic-auth.js shows its own toasts (password change) through window.showToast.
Object.assign(window, { showToast });

const root = createRoot(document.getElementById('root')!);

// Render synchronously, then start everything that works on the rendered DOM, in the order (and at the moment,
// before DOMContentLoaded) the original page script did.
// the English/Assamese choice is saved to the signed-in student's profile (PRD)
setLanguagePersister((lang) => setReadingLanguage(lang));
flushSync(() => root.render(<StrictMode><BrowserRouter><SiteApp /></BrowserRouter></StrictMode>));
initAnimations();
initCampusMap();
checkCurrentStudentSession();
initReportForm();
initTracker();

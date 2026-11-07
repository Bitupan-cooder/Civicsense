import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setLanguagePersister } from '../i18n';
import { SiteApp } from './SiteApp';
import { initAnimations } from './animations.js';
import { initReportForm } from './reportForm';
import { checkCurrentStudentSession, followOtherTabs, setReadingLanguage } from './studentSession';
import './site.css';
import '../workflow.css';


const root = createRoot(document.getElementById('root')!);

// Render synchronously, then start everything that works on the rendered DOM, in the order (and at the moment,
// before DOMContentLoaded) the original page script did.
// the English/Assamese choice is saved to the signed-in student's profile (PRD)
setLanguagePersister((lang) => setReadingLanguage(lang));
flushSync(() => root.render(<StrictMode><BrowserRouter><SiteApp /></BrowserRouter></StrictMode>));
// Let the startup logo reveal finish first so the original landing-page intro is visible afterward.
window.addEventListener('civicsense:startup-complete', () => {
  initAnimations();
  document.body.classList.add('site-entered');
}, { once: true });
checkCurrentStudentSession();
followOtherTabs();
initReportForm();

import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { showToast } from '../toast';
import { SiteApp } from './SiteApp';
import { initAnimations } from './animations.js';
import { initCampusMap } from './campusMap.js';
import { initReportForm } from './reportForm';
import { checkCurrentStudentSession } from './studentSession';
import { initTracker } from './tracker';
import './site.css';

// civic-auth.js shows its own toasts (password change) through window.showToast.
Object.assign(window, { showToast });

const root = createRoot(document.getElementById('root')!);

// Render synchronously, then start everything that works on the rendered DOM, in the order (and at the moment,
// before DOMContentLoaded) the original page script did.
flushSync(() => root.render(<StrictMode><SiteApp /></StrictMode>));
initAnimations();
initCampusMap();
checkCurrentStudentSession();
initReportForm();
initTracker();

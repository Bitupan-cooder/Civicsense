import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '../toast';
import { AdminApp } from './AdminApp';
import { initAuth } from './console';
import './admin.css';

// civic-auth.js shows its own toasts (password change) through window.showToast.
Object.assign(window, { showToast });

createRoot(document.getElementById('root')!).render(<StrictMode><AdminApp /></StrictMode>);
// The session check started on DOMContentLoaded in the old page script; keep that moment.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initAuth());
else initAuth();

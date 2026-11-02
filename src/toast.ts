// Toast notifications (moved from the admin page script). Also on window.showToast for civic-auth.js.
export function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration = 3500): void {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  const dot = document.createElement('span');
  dot.className = 'toast-indicator';
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  toast.append(dot, text);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  const hide = () => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 280);
  };
  const hideTimeout = setTimeout(hide, duration);
  toast.onclick = () => { clearTimeout(hideTimeout); hide(); };
}

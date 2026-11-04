import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CIVICSENSE_BRAND_MARK } from './BrandMark';
import { GlassIconReveal } from '../../components/ui/liquid-glass-logo-reveal';

export function StartupLoader() {
  const [visible, setVisible] = useState(true);
  const host = document.getElementById('startup-loader');

  useEffect(() => {
    const loaderHost = document.getElementById('startup-loader');
    if (!loaderHost) return;
    document.body.classList.add('site-loading');
    loaderHost.classList.add('is-hydrated');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeTimer = window.setTimeout(() => {
      loaderHost.classList.add('is-leaving');
    }, reducedMotion ? 450 : 3500);
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove('site-loading');
      loaderHost.classList.add('is-hidden');
      window.dispatchEvent(new Event('civicsense:startup-complete'));
    }, reducedMotion ? 750 : 3800);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
      document.body.classList.remove('site-loading');
      loaderHost.classList.remove('is-hydrated');
    };
  }, []);

  if (!visible || !host) return null;

  return createPortal(
      <div className="startup-loader-brand" aria-hidden="true">
        <GlassIconReveal
          className="startup-loader-mark"
          logo={CIVICSENSE_BRAND_MARK}
          label="Xohari"
          look="light"
          background="#f8fbf3"
          logoColor="#1a7a3a"
          logoScale={0.56}
          finalScale={0.62}
          loop={false}
          tuning={{ halo: 0 }}
        />
      </div>,
    host,
  );
}

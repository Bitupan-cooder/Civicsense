import StickerSlapFooter from '../../components/ui/sticker-slap-footer';
import { useLanguage } from '../../i18n';

/** Shared Xohari footer used on the landing, report, sign-in, and complaint pages. */
export function Footer() {
  const { lang } = useLanguage();
  const address = lang === 'as'
    ? ['পৰিকলন বিজ্ঞান আৰু প্ৰয়োগ কেন্দ্ৰ (CCSA)', 'ডিব্ৰুগড় বিশ্ববিদ্যালয়']
    : ['Centre for Computer Science & Applications (CCSA)', 'Dibrugarh University'];

  return (
    <StickerSlapFooter
      wordmark="xohari"
      homeHref="/"
      navLabel="Report an issue"
      navHref="/login"
      chatHref="mailto:network-helpdesk@dibru.ac.in"
      chatLabel="Email the campus helpdesk"
      jobsLabel="Explore Xohari"
      jobs={[
        { title: 'Home', href: '/' },
        { title: 'Workflow', href: '/#how' },
        { title: 'Categories', href: '/#categories' },
        { title: 'Track a complaint', href: '/report/new?view=mine#report-tracker' },
      ]}
      officeLabel="Associated with"
      officeLinkText="Blitz"
      officeHref="https://blitz.ccsdu.in"
      address={address}
      mapLabel="Campus emergency: +91 373 237-0239"
      mapHref="tel:+913732370239"
      contactLabel="Campus helpdesk"
      email="network-helpdesk@dibru.ac.in"
      copiedLabel="Copied to clipboard"
      stickers={[]}
      socials={[]}
      credits={[
        { role: 'Platform', name: 'Xohari' },
        { role: 'University', name: 'Dibrugarh University' },
        { role: 'Built by', name: 'BLITZ' },
      ]}
      height="min(820px, 100svh)"
      wordmarkMaxHeight="36svh"
      paper="#f5f9ef"
      panel="#1a7a3a"
      ink="#12351d"
      cream="#ffffff"
      accent="#B5F800"
      fontSans="'Inter Tight', system-ui, sans-serif"
      className="civicsense-footer"
    />
  );
}

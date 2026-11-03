import StickerSlapFooter from '../../components/ui/sticker-slap-footer';

/** Shared CivicSense footer used on the landing, report, sign-in, and complaint pages. */
export function Footer() {
  return (
    <StickerSlapFooter
      wordmark="civicsense"
      homeHref="/"
      navLabel="Report an issue"
      navHref="/login"
      chatHref="mailto:network-helpdesk@dibru.ac.in"
      chatLabel="Email the campus helpdesk"
      jobsLabel="Explore CivicSense"
      jobs={[
        { title: 'Home', href: '/' },
        { title: 'Workflow', href: '/#how' },
        { title: 'Categories', href: '/#categories' },
        { title: 'Track a complaint', href: '/login?view=mine#report-tracker' },
      ]}
      officeLabel="Associated with"
      officeLinkText="Blitz"
      officeHref="https://blitz.ccsdu.in"
      address={['Centre for Computer Science & Applications (CCSA)', 'Dibrugarh University']}
      mapLabel="Campus emergency: +91 373 237-0239"
      mapHref="tel:+913732370239"
      contactLabel="Campus helpdesk"
      email="network-helpdesk@dibru.ac.in"
      copiedLabel="Copied to clipboard"
      stickers={[]}
      socials={[]}
      credits={[
        { role: 'Platform', name: 'CivicSense' },
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

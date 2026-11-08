import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { designSettings as fallbackDesignSettings } from './data/design.js';
import { getContent } from './data/content.js';
import { SiteContext } from './lib/site-context.js';
import { syncThemeColor } from './lib/theme.js';
import { applyDesignTokens, loadDesignSettings } from './lib/design-settings.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import SampleBanner from './components/SampleBanner.jsx';
import ScrollManager from './components/ScrollManager.jsx';
import HomePage from './pages/HomePage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const AdminAuthPage = lazy(() => import('./pages/AdminAuthPage.jsx'));

export default function App() {
  const location = useLocation();
  const isSample = new URLSearchParams(location.search).get('sample') === '1';
  const content = getContent(isSample);
  const [design, setDesign] = useState(fallbackDesignSettings);

  useEffect(() => {
    syncThemeColor();

    let cancelled = false;
    loadDesignSettings()
      .then((settings) => {
        if (cancelled) return;
        applyDesignTokens(settings);
        setDesign(settings);
      })
      .catch(() => {
        if (cancelled) return;
        applyDesignTokens(fallbackDesignSettings);
        setDesign(fallbackDesignSettings);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const site = { content, design, isSample };

  return (
    <SiteContext.Provider value={site}>
      <div
        className="site-shell"
        data-width={design.contentWidth}
        data-spacing={design.sectionSpacing}
        data-radius={design.cornerRadius}
        data-frame={design.imageFrameStyle}
        data-border={design.borderStyle}
        data-type={design.typography.scale}
      >
        <a className="skip-link" href="#main">
          {content.ui.skipToContent}
        </a>
        <ScrollManager />
        <Header />
        <SampleBanner />
        <main id="main" tabIndex="-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<div className="loading-shell">Loading admin…</div>}>
                  <AdminAuthPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SiteContext.Provider>
  );
}

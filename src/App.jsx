import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { designSettings as fallbackDesignSettings } from './data/design.js';
import { content } from './data/content.js';
import { SiteContext } from './lib/site-context.js';
import { syncThemeColor } from './lib/theme.js';
import { applyDesignTokens, loadDesignSettings } from './lib/design-settings.js';
import {
  loadPublishedPortfolioContent,
  mergePublishedPortfolioContent,
} from './lib/portfolio-content.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ScrollManager from './components/ScrollManager.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const AdminAuthPage = lazy(() => import('./pages/AdminAuthPage.jsx'));
const AdminPreviewPage = lazy(() => import('./pages/AdminPreviewPage.jsx'));

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPreviewRoute = location.pathname === '/preview';
  const baseContent = content;
  const [publishedContent, setPublishedContent] = useState(null);
  const [design, setDesign] = useState(fallbackDesignSettings);

  useEffect(() => {
    syncThemeColor();

    let cancelled = false;
    loadPublishedPortfolioContent().then((savedContent) => {
      if (!cancelled) setPublishedContent(savedContent);
    });
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

  const displayedContent = mergePublishedPortfolioContent(baseContent, publishedContent);
  const site = {
    content: displayedContent,
    design,
    onPublishedContentChange: setPublishedContent,
    onDesignChange: setDesign,
  };

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
        {isAdminRoute ? (
          <Routes>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<div className="loading-shell">Loading admin…</div>}>
                  <AdminAuthPage />
                </Suspense>
              }
            />
          </Routes>
        ) : isPreviewRoute ? (
          <Suspense fallback={<div className="loading-shell">Loading preview…</div>}>
            <ScrollManager />
            <AdminPreviewPage design={design} />
          </Suspense>
        ) : (
          <>
            <a className="skip-link" href="#main">
              {content.ui.skipToContent}
            </a>
            <ScrollManager />
            <Header />
            <main id="main" tabIndex="-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </>
        )}
      </div>
    </SiteContext.Provider>
  );
}

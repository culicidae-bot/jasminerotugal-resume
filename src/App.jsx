import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { designSettings as fallbackDesignSettings } from './data/design.js';
import { content } from './data/content.js';
import { SiteContext } from './lib/site-context.js';
import { syncThemeColor } from './lib/theme.js';
import { resolveCanonicalUrl } from './lib/seo.js';
import { applyDesignTokens, loadDesignSettings } from './lib/design-settings.js';
import {
  loadPublishedPortfolioContent,
  mergePublishedPortfolioContent,
} from './lib/portfolio-content.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ScrollManager from './components/ScrollManager.jsx';
import HomePage from './pages/HomePage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const AdminAuthPage = lazy(() => import('./pages/AdminAuthPage.jsx'));
const AdminPreviewPage = lazy(() => import('./pages/AdminPreviewPage.jsx'));

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPreviewRoute = location.pathname === '/preview';
  const isPrivateRoute = isAdminRoute || isPreviewRoute;
  const baseContent = content;
  const [publishedContent, setPublishedContent] = useState(null);
  const [design, setDesign] = useState(fallbackDesignSettings);

  useEffect(() => {
    const robots = document.head.querySelector('meta[name="robots"]');
    const robotsMeta = robots || document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', isPrivateRoute ? 'noindex, nofollow' : 'index, follow');
    if (!robots) document.head.appendChild(robotsMeta);

    const existingCanonical = document.head.querySelector('link[rel="canonical"]');
    const canonical = isPrivateRoute
      ? null
      : resolveCanonicalUrl(import.meta.env.VITE_SITE_ORIGIN, location.pathname);
    if (canonical) {
      const link = existingCanonical || document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonical);
      if (!existingCanonical) document.head.appendChild(link);
    } else if (existingCanonical) {
      existingCanonical.remove();
    }
  }, [isPrivateRoute, location.pathname]);


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
          <>
            <a className="skip-link" href="#main">{content.ui.skipToContent}</a>
            <Routes>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<main id="main" tabIndex="-1" className="loading-shell">Loading admin…</main>}>
                  <AdminAuthPage />
                </Suspense>
              }
            />
          </Routes>
          </>
        ) : isPreviewRoute ? (
          <>
            <a className="skip-link" href="#main">{content.ui.skipToContent}</a>
            <Suspense fallback={<main id="main" tabIndex="-1" className="loading-shell">Loading preview…</main>}>
              <ScrollManager />
              <AdminPreviewPage design={design} />
            </Suspense>
          </>
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
                <Route path="/certificates" element={<CertificatesPage />} />
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

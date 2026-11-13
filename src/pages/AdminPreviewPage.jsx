import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { designSettings as fallbackDesignSettings } from '../data/design.js';
import { content as baseContent } from '../data/content.js';
import { SiteContext } from '../lib/site-context.js';
import { getSupabaseClient } from '../lib/supabase.js';
import {
  loadPortfolioDraft,
  mergePublishedPortfolioContent,
} from '../lib/portfolio-content.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import HomePage from './HomePage.jsx';

/**
 * Owner-only preview of the unpublished draft.
 * Access control is enforced by Supabase: unpublished reads require an
 * authenticated owner at aal2 (RLS + is_owner()). Visitors without that
 * session see an explanatory message, never the draft content.
 */
export default function AdminPreviewPage({ design = fallbackDesignSettings }) {
  const [state, setState] = useState({ status: 'loading', content: null, reason: '' });

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    const checkSession = supabase
      ? supabase.auth.getSession().then(({ data }) => Boolean(data?.session)).catch(() => false)
      : Promise.resolve(false);

    checkSession.then((signedIn) => {
      if (!active) return null;
      if (!signedIn) {
        setState({
          status: 'denied',
          content: null,
          reason:
            'Draft preview is only available to the signed-in portfolio owner at the second authentication level. ' +
            'Sign in at /admin to continue.',
        });
        return null;
      }
      return loadPortfolioDraft();
    }).then((result) => {
      if (!active || !result) return;
      const { content: saved } = result;
      if (!saved) {
        setState({
          status: 'empty',
          content: null,
          reason: 'No saved draft was found. Edit and save a draft in the admin dashboard first.',
        });
        return;
      }
      setState({ status: 'ready', content: mergePublishedPortfolioContent(baseContent, saved), reason: '' });
    }).catch(() => {
      if (!active) return;
      setState({
        status: 'denied',
        content: null,
        reason:
          'Draft preview is only available to the signed-in portfolio owner at the second authentication level. ' +
          'Sign in at /admin to continue.',
      });
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <>
        <PreviewBanner />
        <main id="main" tabIndex="-1" className="preview-shell">
          <p role="status" className="preview-message">Loading your draft preview…</p>
        </main>
      </>
    );
  }

  if (state.status !== 'ready') {
    return (
      <>
        <PreviewBanner />
        <main id="main" tabIndex="-1" className="preview-shell">
          <section className="preview-message" role="alert">
            <h1>Draft preview unavailable</h1>
            <p>{state.reason}</p>
            <p><Link to="/admin">Go to the admin sign in</Link></p>
          </section>
        </main>
      </>
    );
  }

  const site = {
    content: state.content,
    design: design || fallbackDesignSettings,
    onPublishedContentChange: () => {},
    onDesignChange: () => {},
  };

  return (
    <SiteContext.Provider value={site}>
      <PreviewBanner />
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" tabIndex="-1">
        <HomePage />
      </main>
      <Footer />
    </SiteContext.Provider>
  );
}

function PreviewBanner() {
  return (
    <div className="preview-banner" role="status">
      <span className="preview-banner-text">Draft preview — this is not what the public sees</span>
      <Link className="preview-banner-link" to="/admin">Back to admin</Link>
    </div>
  );
}

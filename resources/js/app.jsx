import 'leaflet/dist/leaflet.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.{js,jsx,ts,tsx}');
    const candidates = [
      `./Pages/${name}.jsx`,
      `./Pages/${name}.tsx`,
      `./Pages/${name}.js`,
      `./Pages/${name}.ts`,
    ];
    for (const key of candidates) {
      if (pages[key]) {
        return pages[key]();
      }
    }
    console.error(`Page not found: ./Pages/${name}.jsx`);
    return Promise.resolve({
      default: () => (
        <div>
          Page not found: {name}
        </div>
      ),
    });
  },
  setup({ el, App, props }) {
    const ResolvedApp =
      typeof App === 'object' && App?.default ? App.default : App;
    if (!ResolvedApp || typeof ResolvedApp !== 'function') {
      const root = createRoot(el);
      root.render(<div>App component failed to load</div>);
      return;
    }
    const root = createRoot(el);

    root.render(
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          }
        >
          <Routes>
            <Route path="/admin/warehouses" element={<ResolvedApp {...props} />} />
            <Route path="*" element={<ResolvedApp {...props} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  },
  progress: {
    color: '#4B5563',
  },
});

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

import '../css/backend/main.scss';
import './bootstrap';

// Import Fonts and Icons
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'material-icons/iconfont/material-icons.css';
import 'material-icons/iconfont/outlined.css';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

// Font Sources
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';
import '@fontsource/jost/700.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';

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

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
import { QueryProvider } from './hooks/QueryProvider';
import { NotificationProvider } from './Components/Notifications/NotificationProvider';

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
  // eslint-disable-next-line no-unused-vars
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <QueryProvider>
        <NotificationProvider>
          <App {...props} />
        </NotificationProvider>
      </QueryProvider>
    );
  },
  progress: {
    color: '#bfc0c0ff',
  },
});

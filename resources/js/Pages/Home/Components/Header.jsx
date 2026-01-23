import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import '../../../../css/homepage/header.scss';
import AnnouncementBar from './AnnouncementBar';
import HeaderTop from './HeaderTop';
import Navigation from './Navigation';

export default function Header({
  categoriesData = [],
  showAnnouncementBar = false,
  cartCount,
}) {
  const page = usePage();
  const serverCartCount = page.props?.cart?.count ?? 0;
  const serverCartVersion = page.props?.cart?.version ?? 0;

  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [liveCartCount, setLiveCartCount] = useState(
    typeof cartCount === 'number' ? cartCount : serverCartCount
  );
  const [liveCartVersion, setLiveCartVersion] = useState(serverCartVersion);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const next = typeof cartCount === 'number' ? cartCount : serverCartCount;
    setLiveCartCount(next);
  }, [cartCount, serverCartCount]);

  useEffect(() => {
    setLiveCartVersion(serverCartVersion);
  }, [serverCartVersion]);

  useEffect(() => {
    const handler = (e) => {
      const nextCount = e?.detail?.count;
      const nextVersion = e?.detail?.version;
      if (typeof nextCount === 'number') {
        setLiveCartCount(nextCount);
      }
      if (typeof nextVersion === 'number') {
        setLiveCartVersion(nextVersion);
      }
    };

    window.addEventListener('cart:updated', handler);
    return () => window.removeEventListener('cart:updated', handler);
  }, []);

  const search = async (searchQuery) => {
    setTimeout(() => {
      const s = [
        `${searchQuery} - Electronics`,
        `${searchQuery} - Fashion`,
        `${searchQuery} - Home & Garden`,
        `${searchQuery} - Beauty & Health`,
      ];
      setSuggestions(s);
    }, 400);
  };

  const handleSearch = () => {
    if (query.trim()) {
      search(query);
    }
  };

  const navigationItems = ['Home', ...categoriesData.map((c) => c.name)];

  return (
    <>
      <AnnouncementBar initialVisible={showAnnouncementBar} />
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <HeaderTop
            categoriesData={categoriesData}
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            cartCount={liveCartCount}
            cartVersion={liveCartVersion}
          />
        </div>
        <Navigation items={navigationItems} categoriesData={categoriesData} />
      </header>
      {suggestions.length > 0 && (
        <div className="search-suggestions-container">
          <div className="header-container">
            <div className="search-suggestions">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-tag"
                  onClick={() => {
                    setQuery(suggestion);
                    search(suggestion);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

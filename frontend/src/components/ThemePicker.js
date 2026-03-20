import { useState, useRef, useEffect } from 'react';

const THEMES = [
  { id: 'light',  label: '浅色' },
  { id: 'dark',   label: '深色' },
  { id: 'forest', label: '森林' },
  { id: 'sunset', label: '日落' },
  { id: 'ocean',  label: '海洋' },
];

function ThemePicker({ theme, onThemeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="theme-picker-wrapper" ref={containerRef}>
      <button
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="切换主题"
        aria-expanded={isOpen}
      >
        🎨
      </button>
      {isOpen && (
        <div className="theme-dropdown">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${theme === t.id ? 'active' : ''}`}
              data-theme={t.id}
              onClick={() => { onThemeChange(t.id); setIsOpen(false); }}
            >
              <span className="theme-swatch-small" data-theme={t.id} />
              <span className="theme-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemePicker;

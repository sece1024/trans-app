import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FileUpload from './pages/FileUpload';
import SharedClipboard from './pages/SharedClipboard';
import ServerInfo from './components/ServerInfo';
import ImageUpload from './pages/ImageUpload';
import { ToastProvider } from './context/ToastContext';
import './App.css';

const THEMES = [
  { id: 'light',  label: '浅色' },
  { id: 'dark',   label: '深色' },
  { id: 'forest', label: '森林' },
  { id: 'sunset', label: '日落' },
  { id: 'ocean',  label: '海洋' },
];

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ToastProvider>
    <Router>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            Trans<span>App</span>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end>📁 文件上传</NavLink>
            <NavLink to="/clipboard">📋 共享剪贴板</NavLink>
            <NavLink to="/image">🖼️ 图片上传</NavLink>
          </nav>
          <div className="sidebar-footer">
            <ServerInfo />
            <div className="theme-picker">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className="theme-swatch"
                  data-theme={t.id}
                  aria-label={t.label}
                  aria-pressed={theme === t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                />
              ))}
            </div>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<FileUpload />} />
            <Route path="/clipboard" element={<SharedClipboard />} />
            <Route path="/image" element={<ImageUpload />} />
          </Routes>
        </main>
      </div>
    </Router>
    </ToastProvider>
  );
}

export default App;


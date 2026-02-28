import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FileUpload from './pages/FileUpload';
import SharedClipboard from './pages/SharedClipboard';
import ServerInfo from './components/ServerInfo';
import ImageUpload from './pages/ImageUpload';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
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
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ 浅色模式' : '🌙 深色模式'}
            </button>
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
  );
}

export default App;


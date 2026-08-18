import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FileUpload from './pages/FileUpload';
import SharedClipboard from './pages/SharedClipboard';
import ServerInfo from './components/ServerInfo';
import ImageUpload from './pages/ImageUpload';
import ThemePicker from './components/ThemePicker';
import { ToastProvider } from './context/ToastContext';
// CSS 按 @layer 顺序导入：tokens 必须最先（声明全局层序）
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/animations.css';

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
            <ThemePicker theme={theme} onThemeChange={setTheme} />
          </div>
        </aside>

        <main className="main-content">
          <div className="mobile-server-info">
            <ServerInfo />
          </div>
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


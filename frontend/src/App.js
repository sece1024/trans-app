import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FileUpload from './pages/FileUpload';
import SharedClipboard from './pages/SharedClipboard';
import ServerInfo from './components/ServerInfo';
import ImageUpload from './pages/ImageUpload';
import NotFound from './pages/NotFound';
import ThemePicker from './components/ThemePicker';
import { ToastProvider } from './context/ToastContext';
import { DEFAULT_THEME, THEME_COLORS, normalizeTheme } from './utils/themes';
// CSS 按 @layer 顺序导入：tokens 必须最先（声明全局层序）
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/animations.css';

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return normalizeTheme(localStorage.getItem('theme'));
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    const activeTheme = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', activeTheme);

    // 移动端浏览器地址栏跟随主题，避免深色页面顶部仍是浅色
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', THEME_COLORS[activeTheme]);

    try {
      localStorage.setItem('theme', activeTheme);
    } catch {
      // 隐私模式 / 存储被禁用时只影响记忆功能，不影响当前主题
    }
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
              <NavLink to="/" end>
                📁 文件上传
              </NavLink>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;

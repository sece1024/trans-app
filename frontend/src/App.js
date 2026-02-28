import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FileUpload from './pages/FileUpload';
import SharedClipboard from './pages/SharedClipboard';
import ServerInfo from './components/ServerInfo';
import ImageUpload from './pages/ImageUpload';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="nav-menu">
          <NavLink to="/" end>文件上传</NavLink>
          <NavLink to="/clipboard">共享剪贴板</NavLink>
          <NavLink to="/image">图片上传</NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<FileUpload />} />
          <Route path="/clipboard" element={<SharedClipboard />} />
          <Route path="/image" element={<ImageUpload />} />
        </Routes>

        <ServerInfo />
      </div>
    </Router>
  );
}

export default App;

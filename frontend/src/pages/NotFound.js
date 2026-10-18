import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="page">
      <div className="empty-state" role="status">
        <div className="empty-state-icon" aria-hidden="true">
          🧭
        </div>
        <p className="empty-state-title">页面不存在</p>
        <p className="empty-state-description">这个地址没有对应的页面，可能已经被移动或删除。</p>
        <Link className="btn--text empty-state-action" to="/">
          返回文件页
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

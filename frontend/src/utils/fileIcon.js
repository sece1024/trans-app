// 根据文件扩展名返回对应的 emoji 图标，未知类型回退为 📁
const EXT_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📋', pptx: '📋', zip: '🗜', rar: '🗜', '7z': '🗜',
  mp4: '🎬', mov: '🎬', avi: '🎬', mp3: '🎵', wav: '🎵',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', svg: '🖼', webp: '🖼',
  js: '📜', ts: '📜', py: '🐍', html: '🌐', css: '🎨', json: '⚙️', txt: '📃',
};

export function fileIcon(name) {
  if (!name || typeof name !== 'string') return '📁';
  const ext = name.split('.').pop().toLowerCase();
  return EXT_ICONS[ext] || '📁';
}

export default fileIcon;

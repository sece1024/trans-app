const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 5000; // 后端服务端口

// 启用 CORS
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 示例路由
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// 文件上传路由
const upload = multer({ dest: 'uploads/' });
const uploadedFiles = new Map(); // 用于存储上传的文件

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '没有文件被上传' });
  }

  // 将文件信息保存到服务器缓存中
  uploadedFiles.set(req.file.filename, {
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    uploadTime: new Date()
  });
  //log the file info
  console.log(req.file);

  res.json({ 
    message: '文件上传成功!',
    fileId: req.file.filename
  });
});


app.get('/files/:fileId', (req, res) => {
  const fileInfo = uploadedFiles.get(req.params.fileId);
  if (!fileInfo) {
    return res.status(404).json({ message: '文件未找到' });
  }
  res.json(fileInfo);
});

// get all files info
app.get('/files', (req, res) => {
  res.json(Array.from(uploadedFiles.values()));
});


// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


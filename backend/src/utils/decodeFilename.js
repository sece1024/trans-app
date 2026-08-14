// multer 接收到的文件名是 latin1 编码，需转为 utf8 才能正确还原中文等非 ASCII 字符
function decodeFilename(name) {
  return Buffer.from(name, 'latin1').toString('utf8');
}

module.exports = decodeFilename;

const { Sequelize } = require('sequelize');
const path = require('path');
const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const fs = require('fs');
const logger = require('../config/logger')

if (!fs.existsSync(dbDir)) {
    logger.warn('[multer]: create dbDir ', dbDir)
    fs.mkdirSync(dbDir, { recursive: true });
} else {
    logger.info(`dbDir is existed: ${dbDir}`)
}


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: true // 设置为 true 可以看到 SQL 查询日志
});

module.exports = sequelize;
const {Sequelize} = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger')

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

try {
    if (!fs.existsSync(dbDir)) {
        logger.warn('[multer]: create dbDir ', dbDir)
        fs.mkdirSync(dbDir, {recursive: true});
    } else {
        logger.info(`dbDir is existed: ${dbDir}`)
    }

} catch (error) {
    logger.error(`Failed to create dbDir: ${error.message}`);
}


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false // 设置为 true 可以看到 SQL 查询日志
});

module.exports = sequelize;
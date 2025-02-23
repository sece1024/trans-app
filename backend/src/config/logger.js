const pino = require('pino')

const logger = pino({
    browser: {
        write: (msg) => {
            // 将日志输出到控制台
            console.log(msg);
        },
    },
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname', // 可选：忽略某些字段
        },
    },
})

logger.info('hi pino!');

module.exports = logger;
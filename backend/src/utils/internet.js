const os = require('os');

const internet = {
    getInternetInfos: () => {
        const networkInterfaces = os.networkInterfaces();
        const ips = [];

        // 获取所有网络接口的IP地址
        Object.keys(networkInterfaces).forEach((interfaceName) => {
            const addresses = networkInterfaces[interfaceName];
            addresses.forEach((addr) => {
                // 只获取IPv4地址且不是本地回环地址
                if (addr.family === 'IPv4' && !addr.internal) {
                    ips.push({
                        name: interfaceName,
                        address: addr.address
                    });
                }
            });
        });
        return ips;
    }
}

module.exports = internet;
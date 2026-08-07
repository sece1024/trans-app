const os = require('os');

function getInternetInfos() {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];

  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const addresses = networkInterfaces[interfaceName];
    addresses.forEach((addr) => {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push({
          name: interfaceName,
          address: addr.address,
        });
      }
    });
  });
  return ips;
}

module.exports = { getInternetInfos };

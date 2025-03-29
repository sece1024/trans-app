const { getLocalData } = require('./dataService');

module.exports = {
  localData: getLocalData(),
  sharedData: new Map(),
};

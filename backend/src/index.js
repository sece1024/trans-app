require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

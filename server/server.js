const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '../.env' });
if (!process.env.MONGODB_URI) dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');
const { scheduleRetention } = require('./utils/retention');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  scheduleRetention();
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err && err.message}`);
    server.close(() => process.exit(1));
  });
})();

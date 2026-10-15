// Runs the API against a throw-away in-memory MongoDB, seeded with the resource library and a few
// counsellors. For demos and end-to-end checks without installing MongoDB or touching a real cluster.
//   node scripts/dev-memory.js            (API on :5000; start nlp-service separately on :8001)
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-memory-secret';
process.env.COOKIE_SECURE = 'false'; // plain http on localhost
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'mwh_dev_memory' });

  const Resource = require('../models/Resource');
  const Counselor = require('../models/Counselor');
  const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nlp-service', 'data', 'corpus.json'), 'utf8'));
  await Resource.insertMany(corpus.map((r) => ({
    corpusId: r.id, title: r.title, description: r.description, category: r.category, subtopic: r.subtopic,
    type: r.type, readTime: r.duration_min, tags: r.tags,
  })));
  await Counselor.insertMany([
    { name: 'Dr. Asha Rao', specialization: 'anxiety', bio: 'Student counsellor focused on anxiety and exam stress.', experience: 9, rating: 4.8 },
    { name: 'Rohan Mehta', specialization: 'stress', bio: 'Helps students build healthy routines and manage pressure.', experience: 5, rating: 4.6 },
    { name: 'Priya Nair', specialization: 'relationships', bio: 'Supports friendships, family and relationship challenges.', experience: 7, rating: 4.9 },
  ]);

  const app = require('../app');
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API (in-memory MongoDB) on http://localhost:${port}`));

  const stop = async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();

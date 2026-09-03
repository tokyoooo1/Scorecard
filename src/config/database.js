const mongoose = require('mongoose');

/**
 * Database connection.
 *
 * server.js loads dotenv before requiring this file, so DBSTRING is read at
 * call time rather than import time (the previous version called
 * require('dotenv').config() here as a workaround for the ordering bug).
 */
const connectDB = async () => {
  const DBSTRING = process.env.DBSTRING;

  // Fail loudly and immediately on missing config rather than handing mongoose
  // `undefined` and getting an opaque "Invalid scheme" parse error.
  if (!DBSTRING) {
    console.error(
      '\n❌ DBSTRING is not set.\n' +
      '   Create a .env file (copy .env.example) and set, for example:\n' +
      '   DBSTRING=mongodb://127.0.0.1:27017/scorecard\n'
    );
    process.exit(1);
  }

  try {
    console.log('connecting to database...');
    await mongoose.connect(DBSTRING, {
      // Default is 30s, which looks like a silent hang when Mongo is not
      // running. 8s is long enough for a real Atlas handshake, short enough
      // that a wrong host is obvious quickly.
      serverSelectionTimeoutMS: 8000,
    });
    console.log('connection to database established ✅');

    mongoose.connection.on('disconnected', () => console.warn('DB disconnected. Attempting reconnection'));
    mongoose.connection.on('reconnected',  () => console.info('DB reconnected'));
    mongoose.connection.on('error',        (err) => console.error('DB connection err:', err.message));

  } catch (err) {
    console.error('\n❌ Error connecting to DB:', err.message);
    if (/ECONNREFUSED|ServerSelection/i.test(err.message)) {
      console.error(
        '   MongoDB does not appear to be reachable at that address.\n' +
        '   • Local install: make sure mongod is running.\n' +
        '   • Atlas: check the connection string and that your IP is allowlisted.\n'
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;

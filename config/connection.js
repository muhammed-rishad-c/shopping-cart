const { MongoClient } = require('mongodb');

const state = {
  db: null,
};

module.exports.connect = async function (done) {
  const url = 'mongodb://localhost:27017';
  const dbname = 'shopping';

  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log('Connected to MongoDB');

    state.db = client.db(dbname);

    // Now you can use the database connection
    // For example:
    // const collection = state.db.collection('mycollection');
    // Perform queries or updates here

    // Don't forget to close the connection when done
    // await client.close();
    done(null); // Call the callback to indicate successful connection
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    done(error); // Call the callback with an error if connection fails
  }
};

module.exports.get = function () {
  return state.db;
};

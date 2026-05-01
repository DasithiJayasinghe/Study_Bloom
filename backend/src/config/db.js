const mongoose = require('mongoose');

const sanitizeMongoUri = (uri) => {
  const trimmedUri = uri.trim();
  const [base, query = ''] = trimmedUri.split('?');

  if (!query) {
    return trimmedUri;
  }

  const isSrvUri = base.toLowerCase().startsWith('mongodb+srv://');
  const params = new URLSearchParams(query);
  const deduped = new URLSearchParams();
  const seenKeys = new Set();

  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase();

    // SRV records already provide topology options; avoid duplicate replicaSet conflicts.
    if (isSrvUri && normalizedKey === 'replicaset') {
      continue;
    }

    if (seenKeys.has(normalizedKey)) {
      continue;
    }

    seenKeys.add(normalizedKey);
    deduped.append(key, value);
  }

  const sanitizedQuery = deduped.toString();
  return sanitizedQuery ? `${base}?${sanitizedQuery}` : base;
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in environment variables');
  }

  try {
    const sanitizedMongoUri = sanitizeMongoUri(mongoUri);
    const conn = await mongoose.connect(sanitizedMongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

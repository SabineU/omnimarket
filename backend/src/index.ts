// backend/src/index.ts
// Entry point – starts the Express server.
import 'dotenv/config'; // Load .env file at the very beginning
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 OmniMarket API running on http://localhost:${PORT}`);
});

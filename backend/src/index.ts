// backend/src/index.ts
// Entry point – starts the Express server with validated configuration.
import { config } from './config.js';
import app from './app.js';

const PORT = config.PORT; // Already validated, so it's always a number

app.listen(PORT, () => {
  console.log(`🚀 OmniMarket API running on http://localhost:${PORT}`);
});

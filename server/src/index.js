import app from './app.js';
import { port } from './config.js';
import { initializeDatabase } from './dataStore.js';

await initializeDatabase();

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
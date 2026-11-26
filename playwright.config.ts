import { defineConfig } from "@playwright/test";

import { e2eMongoUri } from "./e2e/database";

// Not the dev ports (3001 backend, 5173 client). The client port must be in the CORS list of
// the backend (3000 and 5173 are), and the dev client uses 5173, so the tests use 3000.
const API_PORT = 3101;
const WEB_PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: "retain-on-failure" },
  webServer: [
    {
      // The backend, on its own database. A variable set here wins over backend/.env.
      command: "npm start -w backend",
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      env: { PORT: String(API_PORT), MONGODB_URI: e2eMongoUri() },
    },
    {
      // The React app, talking to the test backend.
      command: `npm run dev -w frontend -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
});

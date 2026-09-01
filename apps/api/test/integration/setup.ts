import { afterAll, beforeAll, beforeEach } from "vitest";

import {
  cleanupIntegrationDatabase,
  closeIntegrationDatabase,
  initializeIntegrationDatabase,
  resetIntegrationDatabase,
} from "./database.js";

beforeAll(async () => {
  await initializeIntegrationDatabase();
});

beforeEach(async () => {
  await resetIntegrationDatabase();
});

afterAll(async () => {
  try {
    await cleanupIntegrationDatabase();
  } finally {
    await closeIntegrationDatabase();
  }
});

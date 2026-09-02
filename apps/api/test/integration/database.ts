import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { createDatabase } from "../../src/db/database.js";
import { professors, reviews } from "../../src/db/schema.js";
import { createProfessorsRepository } from "../../src/modules/professors/repository.js";
import { createReviewsRepository } from "../../src/modules/reviews/repository.js";

const integrationDatabaseName = "profrate_test";
export const reviewFixtureTimestamp = new Date("2025-01-10T12:00:00.000Z");
const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

const professorFixtures = [
  { name: "Alice Teste", department: "Departamento Alfa" },
  { name: "Bruno Teste", department: "Departamento Beta" },
  { name: "Carla Teste", department: "Departamento Gama" },
];

type DatabaseTarget = {
  hostname: string;
  port: string;
  database: string;
};

function parseUrl(value: string, variableName: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid database URL.`);
  }
}

function databaseNameFromUrl(url: URL, variableName: string): string {
  try {
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    throw new Error(`${variableName} must identify a valid database name.`);
  }
}

function databaseTarget(url: URL, variableName: string): DatabaseTarget {
  return {
    hostname: url.hostname.toLowerCase(),
    port: url.port || "5432",
    database: databaseNameFromUrl(url, variableName),
  };
}

function targetsAreEqual(left: DatabaseTarget, right: DatabaseTarget): boolean {
  return (
    left.hostname === right.hostname &&
    left.port === right.port &&
    left.database === right.database
  );
}

function readSafeIntegrationDatabaseUrl(): string {
  const integrationUrlValue = process.env.INTEGRATION_DATABASE_URL;

  if (!integrationUrlValue) {
    throw new Error("INTEGRATION_DATABASE_URL must be configured.");
  }

  const integrationUrl = parseUrl(
    integrationUrlValue,
    "INTEGRATION_DATABASE_URL",
  );

  if (
    integrationUrl.protocol !== "postgresql:" &&
    integrationUrl.protocol !== "postgres:"
  ) {
    throw new Error(
      "INTEGRATION_DATABASE_URL must use a PostgreSQL protocol.",
    );
  }

  const integrationTarget = databaseTarget(
    integrationUrl,
    "INTEGRATION_DATABASE_URL",
  );

  if (integrationTarget.database !== integrationDatabaseName) {
    throw new Error("Integration database must be exactly profrate_test.");
  }

  const developmentUrlValue = process.env.DATABASE_URL;

  if (developmentUrlValue) {
    if (integrationUrlValue === developmentUrlValue) {
      throw new Error(
        "Integration and development database URLs must be different.",
      );
    }

    const developmentUrl = parseUrl(developmentUrlValue, "DATABASE_URL");
    const developmentTarget = databaseTarget(developmentUrl, "DATABASE_URL");

    if (targetsAreEqual(integrationTarget, developmentTarget)) {
      throw new Error(
        "Integration database target must differ from the development database target.",
      );
    }
  }

  return integrationUrlValue;
}

async function assertConnectedToIntegrationDatabase(pool: Pool): Promise<void> {
  const result = await pool.query<{ currentDatabase: string }>(
    'SELECT current_database() AS "currentDatabase"',
  );

  if (result.rows.at(0)?.currentDatabase !== integrationDatabaseName) {
    throw new Error("Connected database must be exactly profrate_test.");
  }
}

type IntegrationDatabase = ReturnType<typeof createDatabase>;

type IntegrationContext = {
  database: IntegrationDatabase;
  professorsRepository: ReturnType<typeof createProfessorsRepository>;
  reviewsRepository: ReturnType<typeof createReviewsRepository>;
};

let context: IntegrationContext | undefined;

export async function initializeIntegrationDatabase(): Promise<void> {
  if (context !== undefined) {
    return;
  }

  const connectionString = readSafeIntegrationDatabaseUrl();
  const database = createDatabase(connectionString);

  try {
    await assertConnectedToIntegrationDatabase(database.pool);
    await migrate(database.db, { migrationsFolder });

    context = {
      database,
      professorsRepository: createProfessorsRepository(database.db),
      reviewsRepository: createReviewsRepository(database.db),
    };
  } catch (error) {
    await database.close();
    throw error;
  }
}

export function getIntegrationContext(): IntegrationContext {
  if (context === undefined) {
    throw new Error("Integration database has not been initialized.");
  }

  return context;
}

async function truncateIntegrationTables(): Promise<void> {
  const { database } = getIntegrationContext();

  await assertConnectedToIntegrationDatabase(database.pool);
  await database.db.execute(
    sql`TRUNCATE TABLE reviews, professors RESTART IDENTITY CASCADE`,
  );
}

export async function resetIntegrationDatabase(): Promise<void> {
  await truncateIntegrationTables();

  const { database } = getIntegrationContext();
  const insertedProfessors = await database.db
    .insert(professors)
    .values(professorFixtures)
    .returning({ id: professors.id });

  await database.db.insert(reviews).values([
    {
      professorId: insertedProfessors[0].id,
      rating: 5,
      comment: "Primeira avaliação de teste.",
      createdAt: reviewFixtureTimestamp,
      updatedAt: reviewFixtureTimestamp,
    },
    {
      professorId: insertedProfessors[0].id,
      rating: 4,
      comment: "Segunda avaliação de teste.",
      createdAt: reviewFixtureTimestamp,
      updatedAt: reviewFixtureTimestamp,
    },
    {
      professorId: insertedProfessors[1].id,
      rating: 3,
      comment: "Terceira avaliação de teste.",
      createdAt: reviewFixtureTimestamp,
      updatedAt: reviewFixtureTimestamp,
    },
  ]);
}

export async function cleanupIntegrationDatabase(): Promise<void> {
  if (context !== undefined) {
    await truncateIntegrationTables();
  }
}

export async function closeIntegrationDatabase(): Promise<void> {
  const activeContext = context;
  context = undefined;

  if (activeContext !== undefined) {
    await activeContext.database.close();
  }
}

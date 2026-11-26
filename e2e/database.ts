const E2E_DATABASE = "reading-list-e2e";

/** The connection string for the E2E tests: the one of backend/.env, with the database `reading-list-e2e`. */
export function e2eMongoUri(): string {
  // The tests run in the root folder. A variable that is already set wins over the file.
  try {
    process.loadEnvFile("backend/.env");
  } catch {
    // No .env file: the variable may come from the environment.
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Fill in backend/.env.");
  }

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    // Not the original error: it can contain the connection string.
    throw new Error("MONGODB_URI is not a valid connection string.");
  }

  url.pathname = `/${E2E_DATABASE}`;

  // Guard: never run the tests against a database whose name does not end with -e2e.
  const name = url.pathname.slice(1);
  if (!name.endsWith("-e2e")) {
    throw new Error(
      `The E2E tests only run against a database ending with "-e2e", not "${name}".`
    );
  }

  return url.toString();
}

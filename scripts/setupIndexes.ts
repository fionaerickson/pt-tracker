/** Create the §5 indexes against MONGODB_URI:  `npm run setup:indexes` */
import { ensureIndexes } from "../src/lib/db/init";

try {
  process.loadEnvFile(".env"); // Node 20.12+/22 — auto-load local .env
} catch {
  // no .env; rely on the ambient environment
}

ensureIndexes()
  .then(() => {
    console.log("Indexes created (or already present).");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

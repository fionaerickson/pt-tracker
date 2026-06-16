/** Seed sample data against MONGODB_URI:  `npm run seed` */
import { seed } from "../src/lib/seed";

try {
  process.loadEnvFile(".env"); // Node 20.12+/22 — auto-load local .env
} catch {
  // no .env; rely on the ambient environment
}

seed()
  .then((r) => {
    console.log("Seeded:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

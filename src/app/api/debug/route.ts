/**
 * Temporary connection diagnostic — reports what the deployment actually sees in
 * MONGODB_URI (password masked) and the result of a live connection attempt.
 * Visit /api/debug. Remove this route once setup is confirmed.
 */
import { ok, handle } from "@/lib/api";
import { MongoClient } from "mongodb";

export const GET = handle(async () => {
  const uri = process.env.MONGODB_URI ?? "";
  const report: Record<string, unknown> = {
    hasUri: Boolean(uri),
    rawLength: uri.length,
    hasLeadingOrTrailingSpace: uri !== uri.trim(),
    containsAngleBrackets: /[<>]/.test(uri),
    containsQuotes: /["']/.test(uri),
    MONGODB_DB: process.env.MONGODB_DB ?? null,
    hasDefaultUserId: Boolean(process.env.DEFAULT_USER_ID),
  };

  try {
    const u = new URL(uri);
    const pw = decodeURIComponent(u.password || "");
    report.scheme = u.protocol.replace(":", "");
    report.username = decodeURIComponent(u.username || "");
    report.host = u.hostname;
    report.pathHasDbName = u.pathname.length > 1;
    report.passwordLength = pw.length;
    report.passwordHasNonAlphanumeric = /[^A-Za-z0-9]/.test(pw);
  } catch (e) {
    report.parseError = (e as Error).message;
  }

  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    report.connection = "OK";
  } catch (e) {
    report.connection = "FAILED";
    report.connectionError = (e as Error).message;
  }

  return ok(report);
});

export const dynamic = "force-dynamic";

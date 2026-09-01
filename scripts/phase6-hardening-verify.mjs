/**
 * Phase 6 hardening — live smoke checks.
 * Prerequisites: API running (docker + pnpm --filter @momeva/api dev).
 *
 * Usage: node scripts/phase6-hardening-verify.mjs
 */
import { execSync } from "node:child_process";

const API = (process.env.API_URL ?? "http://localhost:3001/v1").replace(
  /\/+$/,
  "",
);
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchRaw(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, contentType: res.headers.get("content-type") ?? "" };
}

async function main() {
  console.log("Phase 6 hardening verification\n");

  // 1. Domain unit tests
  try {
    execSync("pnpm --filter @momeva/domain test", {
      stdio: "pipe",
      encoding: "utf8",
    });
    pass("Domain unit tests");
  } catch (e) {
    fail("Domain unit tests", String(e.stderr ?? e.message ?? e));
  }

  // 2. Health still OK
  try {
    const { res, body } = await fetchRaw(`${API}/health`);
    if (res.ok && body?.database === "ok") {
      pass("Health endpoint", `status=${body.status}`);
    } else {
      fail("Health endpoint", `${res.status} ${JSON.stringify(body)}`);
    }
  } catch (e) {
    fail("Health endpoint", String(e.message ?? e));
  }

  // 3. RFC 7807 problem details on 404
  try {
    const { res, body, contentType } = await fetchRaw(
      `${API}/public/events/this-slug-does-not-exist-phase6`,
    );
    const isProblem =
      contentType.includes("application/problem+json") ||
      contentType.includes("application/json");
    const shapeOk =
      body &&
      typeof body === "object" &&
      body.type === "about:blank" &&
      typeof body.title === "string" &&
      body.status === 404 &&
      typeof body.detail === "string" &&
      typeof body.instance === "string" &&
      typeof body.requestId === "string";

    if (res.status === 404 && isProblem && shapeOk) {
      pass(
        "RFC 7807 problem details (404)",
        `title=${body.title}; content-type=${contentType}`,
      );
    } else {
      fail(
        "RFC 7807 problem details (404)",
        `${res.status} ct=${contentType} body=${JSON.stringify(body)}`,
      );
    }
  } catch (e) {
    fail("RFC 7807 problem details (404)", String(e.message ?? e));
  }

  // 4. Validation error → problem details (400)
  try {
    const { res, body, contentType } = await fetchRaw(
      `${API}/auth/magic-link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      },
    );
    const shapeOk =
      body &&
      typeof body === "object" &&
      body.status === 400 &&
      typeof body.detail === "string" &&
      typeof body.requestId === "string";

    if (res.status === 400 && shapeOk) {
      pass(
        "RFC 7807 problem details (400 validation)",
        contentType.includes("problem+json")
          ? "problem+json"
          : `ct=${contentType}`,
      );
    } else {
      fail(
        "RFC 7807 problem details (400 validation)",
        `${res.status} ${JSON.stringify(body)}`,
      );
    }
  } catch (e) {
    fail("RFC 7807 problem details (400 validation)", String(e.message ?? e));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${results.length - failed}/${results.length} passed${failed ? ` (${failed} failed)` : ""}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

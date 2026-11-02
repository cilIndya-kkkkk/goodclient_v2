const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
const FILE_PATTERN = /^[a-f0-9]{64}\.bin$/;
const MAX_BYTES = 512 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/vault" || url.pathname === "/vault/list")) {
      const auth = request.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
      if (!env.ADMIN_TOKEN) return json({ error: "admin token not configured" }, 503);
      if (token !== env.ADMIN_TOKEN) return json({ error: "unauthorized" }, 401);
      const result = await env.DB.prepare(
        "SELECT filename, length(ciphertext) AS bytes, updated_at FROM vaults ORDER BY updated_at DESC"
      ).all();
      return json({ vaults: result.results || [] });
    }

    const match = url.pathname.match(/^\/vault\/([^/]+)$/);
    if (!match) return json({ error: "not found" }, 404);
    const filename = match[1];
    if (!FILE_PATTERN.test(filename)) return json({ error: "invalid filename" }, 400);

    if (request.method === "GET") {
      const row = await env.DB.prepare("SELECT ciphertext, updated_at FROM vaults WHERE filename = ?")
        .bind(filename)
        .first();
      if (!row || !row.ciphertext) return new Response("not found", { status: 404, headers: CORS });
      const bytes = row.ciphertext instanceof ArrayBuffer ? new Uint8Array(row.ciphertext) : row.ciphertext;
      return new Response(bytes, {
        headers: {
          ...CORS,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (request.method === "PUT") {
      const declaredLength = Number(request.headers.get("content-length") || 0);
      if (declaredLength > MAX_BYTES) return json({ error: "too large" }, 413);
      const body = await request.arrayBuffer();
      if (!body.byteLength) return json({ error: "empty body" }, 400);
      if (body.byteLength > MAX_BYTES) return json({ error: "too large" }, 413);
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO vaults (filename, ciphertext, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(filename) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at`
      )
        .bind(filename, body, now)
        .run();
      return json({ ok: true, filename, bytes: body.byteLength, updatedAt: now });
    }

    return json({ error: "method not allowed" }, 405);
  },
};

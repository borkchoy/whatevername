const { resolve, sep } = require("node:path");

const links = new Map();
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const PORT = Number.parseInt(process.env.PORT || "3000", 10) || 3000;
const PUBLIC_DIR = process.env.PUBLIC_DIR;
const RESOLVED_PUBLIC_DIR = PUBLIC_DIR ? resolve(PUBLIC_DIR) : null;
const IS_WINDOWS = process.platform === "win32";

function normalizePathForComparison(value) {
  return IS_WINDOWS ? value.toLowerCase() : value;
}

function getBaseUrl() {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return `http://localhost:${PORT}`;
}

const BASE_URL = getBaseUrl().replace(/\/$/, "");

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function errorResponse(status, message) {
  return jsonResponse(status, { error: message });
}

function generateCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  let code = "";
  for (let i = 0; i < bytes.length; i += 1) {
    code += BASE62[bytes[i] % BASE62.length];
  }
  return code;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function createUniqueCode() {
  let code = generateCode();
  while (links.has(code)) {
    code = generateCode();
  }
  return code;
}

function toLinkDto(link) {
  return {
    code: link.code,
    url: link.url,
    shortUrl: `${BASE_URL}/${link.code}`,
    hits: link.hits,
    createdAt: link.createdAt,
  };
}

async function tryServeStatic(pathname) {
  if (!RESOLVED_PUBLIC_DIR) {
    return null;
  }

  let requestedPath = pathname;
  try {
    requestedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const candidatePath = resolve(RESOLVED_PUBLIC_DIR, relativePath);
  const normalizedCandidate = normalizePathForComparison(candidatePath);
  const normalizedRoot = normalizePathForComparison(RESOLVED_PUBLIC_DIR);

  if (
    normalizedCandidate !== normalizedRoot &&
    !normalizedCandidate.startsWith(`${normalizedRoot}${sep}`)
  ) {
    return null;
  }

  const file = Bun.file(candidatePath);
  if (!(await file.exists())) {
    return null;
  }

  return new Response(file, {
    status: 200,
    headers: corsHeaders(),
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (req.method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await req.json();
      } catch {
        return errorResponse(400, "Invalid JSON");
      }

      if (!isValidHttpUrl(body?.url)) {
        return errorResponse(400, "url must be an http(s) URL");
      }

      const code = createUniqueCode();
      const link = {
        code,
        url: body.url,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, link);
      return jsonResponse(201, toLinkDto(link));
    }

    if (req.method === "GET" && pathname === "/api/links") {
      const allLinks = Array.from(links.values(), (link) => toLinkDto(link));
      return jsonResponse(200, allLinks);
    }

    if (req.method === "GET") {
      const staticResponse = await tryServeStatic(pathname);
      if (staticResponse) {
        return staticResponse;
      }

      const code = pathname.slice(1);
      const link = links.get(code);
      if (!link) {
        return new Response("Not Found", {
          status: 404,
          headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
        });
      }

      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: corsHeaders({ Location: link.url }),
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  },
});

console.log(`Snip backend listening on ${BASE_URL} (port ${PORT})`);

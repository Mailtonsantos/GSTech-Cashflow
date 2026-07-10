import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 5173);
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const mappedPath = url.pathname.startsWith("/assets/")
    ? `/public${url.pathname}`
    : url.pathname === "/"
      ? "/index.html"
      : url.pathname;
  const cleanPath = normalize(mappedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, cleanPath);

  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    const content = await readFile(join(root, "index.html"));
    response.writeHead(200, { "Content-Type": types[".html"] });
    response.end(content);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`GSTec Cashflow rodando em http://127.0.0.1:${port}`);
});

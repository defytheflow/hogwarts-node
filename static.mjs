import fs from "node:fs/promises";
import path from "node:path";

export default serveStatic;

const STATIC_URL = "/public/";
const STATIC_PATH = path.join(process.cwd(), "public");

var MIME_TYPES = {
  default: "application/octet-stream",
  html: "text/html; charset=utf-8",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {() => void} next
 */
async function serveStatic(req, res, next) {
  if (req.url.startsWith(STATIC_URL)) {
    let filePath = path.join(STATIC_PATH, req.url.replace(STATIC_URL, ""));
    let fileExists = await fs.access(filePath).then(
      () => true,
      () => false
    );
    let fileFound = filePath.startsWith(STATIC_PATH) && fileExists;
    if (!fileFound) {
      res
        .writeHead(404, { "Content-Type": "text/html" })
        .end("<h1>Not found!</h1>\n");
    } else {
      let fileExt = path.extname(filePath).slice(1).toLowerCase();
      let mimeType = MIME_TYPES[fileExt] ?? MIME_TYPES.default;
      let buffer = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": mimeType }).end(buffer);
    }
  } else {
    next();
  }
}

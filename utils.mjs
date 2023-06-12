import http from "node:http";

export { json, redirect };

/**
 * @param {http.ServerResponse} res
 * @param {any} data
 * @param {number} statusCode
 */
function json(res, data, statusCode = 200) {
  res
    .writeHead(statusCode, { "Content-Type": "application/json" })
    .end(JSON.stringify(data));
}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} path
 * @param {number} statusCode
 */
function redirect(req, res, path, statusCode = 302) {
  res
    .writeHead(statusCode, { Location: `http://${req.headers.host}${path}` })
    .end();
}

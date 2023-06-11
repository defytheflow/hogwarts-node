import http from "http";

export { json, redirect, parseFormData };

/**
 * @param {http.ServerResponse} res
 * @param {any} object
 */
function json(res, object) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(object));
}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} path
 * @param {number} statusCode
 */
function redirect(req, res, path, statusCode = 302) {
  res.writeHead(statusCode, { Location: `http://${req.headers.host}${path}` });
  res.end();
}

/**
 * @param {http.IncomingMessage} req
 * @returns {Promise<FormData>}
 */
async function parseFormData(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];

    req.on("data", function (chunk) {
      chunks.push(chunk);
    });

    req.on("end", function () {
      var body = Buffer.concat(chunks).toString();
      var params = new URLSearchParams(body);
      var formData = new FormData();

      for (let [key, value] of params) {
        formData.append(key, value);
      }

      resolve(formData);
    });

    req.on("error", reject);
  });
}

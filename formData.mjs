export default parseFormData;

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {() => void} next
 */
async function parseFormData(req, res, next) {
  var hasContentLength = req.headers["content-length"] != null;
  var hasTransferEncoding = req.headers["transfer-encoding"] != null;
  var hasBody = hasContentLength || hasTransferEncoding;

  if (hasBody) {
    req.formData = await parse(req);
  }

  next();
}

/**
 * @param {http.IncomingMessage} req
 * @returns {Promise<FormData>}
 */
async function parse(req) {
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

import http from "http";
import url from "url";

export default class Router {
  /**
   * @typedef {(
   *   request: http.IncomingMessage,
   *   response: http.ServerResponse,
   *   params: Record<string, string>,
   * ) => void} RequestHandler
   */

  /**
   * @type {Record<string, {regex: RegExp; get?: RequestHandler, post?: RequestHandler}>}
   */
  #routes = Object.create(null);

  /**
   * @param {string} path
   * @param {RequestHandler} handler
   */
  get(path, handler) {
    if (!(path in this.#routes)) {
      this.#routes[path] = { regex: Router.#pathToRegex(path) };
    }
    this.#routes[path].get = handler;
  }

  /**
   * @param {string} path
   * @param {RequestHandler} handler
   */
  post(path, handler) {
    if (!(path in this.#routes)) {
      this.#routes[path] = { regex: Router.#pathToRegex(path) };
    }
    this.#routes[path].post = handler;
  }

  /**
   * @param {string} path
   * @param {RequestHandler} handler
   */
  all(path, handler) {
    this.get(path, handler);
    this.post(path, handler);
  }

  /**
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   */
  handler(request, response) {
    var { pathname } = url.parse(request.url);

    for (let route of Object.values(this.#routes)) {
      let match = route.regex.exec(pathname);

      if (match) {
        let handler = route[request.method.toLowerCase()];

        if (handler) {
          let params = match.groups ?? {};
          handler(request, response, params);
        } else {
          response.writeHead(405).end();
        }

        return;
      }
    }

    response
      .writeHead(404, { "Content-Type": "text/html" })
      .end("<h1>Page not found!</h1>\n");
  }

  static #pathToRegex(path) {
    return new RegExp("^" + path.replace(/:([\w.]+)/, "(?<$1>[\\w.]+)") + "$");
  }
}

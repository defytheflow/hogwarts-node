import http from "http";
import url from "url";

export default class Router {
  /**
   * @typedef {(
   *   req: http.IncomingMessage,
   *   res: http.ServerResponse,
   *   params: Record<string, string>,
   * ) => void} RequestHandler
   */

  /**
   *  @typedef {(
   *    req: http.IncomingMessage,
   *    res: http.ServerResponse,
   *    next: () => void) => Promise<void>} MiddlewareFunction
   */

  /**
   * @type {Record<string, {regex: RegExp; get?: RequestHandler, post?: RequestHandler}>}
   */
  #routes = Object.create(null);

  /**
   * @type {MiddlewareFunction[]}
   */
  #middlewares = [];

  /**
   * @param {MiddlewareFunction} middleware
   */
  use(middleware) {
    this.#middlewares.push(middleware);
  }

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
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async handle(req, res) {
    var lastMiddlewareCalledNext = await this.#applyMiddleware(req, res);

    if (!lastMiddlewareCalledNext) {
      return;
    }

    var { pathname } = url.parse(req.url);

    for (let route of Object.values(this.#routes)) {
      let match = route.regex.exec(pathname);

      if (match) {
        let handler = route[req.method.toLowerCase()];

        if (handler) {
          let params = match.groups ?? {};
          handler(req, res, params);
        } else {
          res.writeHead(405).end();
        }

        return;
      }
    }

    res
      .writeHead(404, { "Content-Type": "text/html" })
      .end("<h1>Page not found!</h1>\n");
  }

  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   * @returns {Promise<boolean>}
   */
  async #applyMiddleware(req, res) {
    var lastMiddlewareCalledNext = true;

    for (let middleware of this.#middlewares) {
      let nextCalled = false;

      await middleware(req, res, function next() {
        nextCalled = true;
      });

      if (!nextCalled) {
        lastMiddlewareCalledNext = false;
        break;
      }
    }

    return lastMiddlewareCalledNext;
  }

  /**
   * @param {string} path
   * @returns {RegExp}
   */
  static #pathToRegex(path) {
    return new RegExp("^" + path.replace(/:([\w.]+)/, "(?<$1>[\\w.]+)") + "$");
  }
}

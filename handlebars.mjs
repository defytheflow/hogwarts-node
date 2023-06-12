import fs from "node:fs/promises";
import path from "node:path";

import handlebars from "handlebars";

export { renderTemplate };

handlebars.registerHelper("select", function (selected, options) {
  return options
    .fn(this)
    .replace(new RegExp(' value="' + selected + '"'), '$& selected="selected"');
});

/**
 * @param {string} name
 * @param {Record<string, unknown>} context
 * @returns {Promise<string>}
 */
async function renderTemplate(name, context) {
  let templateStr = await fs.readFile(path.join("templates", name), "utf-8");
  let template = handlebars.compile(templateStr);
  let htmlStr = template(context);
  return htmlStr;
}

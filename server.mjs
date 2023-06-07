import http from "http";
import url from "url";
import fs from "fs/promises";
import path from "path";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import handlebars from "handlebars";

const HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
const PORT = process.env.PORT || 8000;

var db = await open({
  filename: "hogwarts.db",
  driver: sqlite3.Database,
});

handlebars.registerHelper("select", function (selected, options) {
  return options
    .fn(this)
    .replace(new RegExp(' value="' + selected + '"'), '$& selected="selected"');
});

var House = {
  GRYFFINDOR: "Gryffindor",
  SLYTHERIN: "Slytherin",
  HUFFLEPUFF: "Hufflepuff",
  RAVENCLAW: "Ravenclaw",
};

var HOUSES = Object.values(House);

var ROUTES = new Map();

ROUTES.set(/^\/students$/, studentList);
ROUTES.set(/^\/students\/delete$/, studentDelete);
ROUTES.set(/^\/students\/(?<id>\d+)\/change$/, studentChange);

var server = http.createServer(function handler(request, response) {
  var parsedURL = url.parse(request.url);

  for (let [routeRegex, routeHandler] of ROUTES.entries()) {
    let match = routeRegex.exec(parsedURL.pathname);
    if (match) {
      let params = match.groups ?? {};
      routeHandler(request, response, params);
      return;
    }
  }

  response.writeHead(404, { "Content-Type": "text/html" });
  response.end("<h1>Page not found!</h1>\n");
});

async function studentList(request, response) {
  var parsedURL = url.parse(request.url);

  if (request.method == "POST") {
    let body = "";
    request.on("data", function handleChunk(data) {
      body += data;
    });

    request.on("end", async function handleEnd() {
      let searchParams = new URLSearchParams(body);

      let studentName = searchParams.get("name");
      let studentHouse = searchParams.get("house");

      if (studentName && HOUSES.includes(studentHouse)) {
        let isUniqueStudent =
          (
            await db.get(
              "SELECT EXISTS(SELECT 1 FROM students WHERE name = ?) AS exists_",
              studentName
            )
          ).exists_ == 0;

        if (isUniqueStudent) {
          // students.push({ name: studentName, house: studentHouse });
          await db.run(
            "INSERT INTO students (name, house) VALUES (?, ?)",
            studentName,
            studentHouse
          );
        }
      }

      response.writeHead(302, {
        Location: `http://${HOSTNAME}:${PORT}/students`,
      });
      response.end();
    });
  } else {
    let searchParams = new URLSearchParams(parsedURL.query);
    let order = searchParams.get("order");

    let query = "SELECT id, name, house FROM students";
    if (order == "abc") {
      query += " ORDER BY name ASC";
    } else if (order == "zyx") {
      query += " ORDER BY name DESC";
    }

    let students = await db.all(query);
    let html = await renderTemplate("students.html", {
      students,
      houses: HOUSES,
      order,
    });
    response.setHeader("Content-Type", "text/html");
    response.end(html);
  }
}

async function studentDelete(request, response) {
  if (request.method == "POST") {
    let body = "";
    request.on("data", function handleChunk(data) {
      body += data;
    });

    request.on("end", async function handleEnd() {
      let searchParams = new URLSearchParams(body);

      let studentId = searchParams.get("id");

      if (studentId) {
        await db.run("DELETE FROM students WHERE id = ?", studentId);
      }

      response.writeHead(302, {
        Location: `http://${HOSTNAME}:${PORT}/students`,
      });
      response.end();
    });
  } else {
    response.statusCode = 405;
    response.end();
  }
}

async function studentChange(request, response, params) {
  let studentId = params.id;
  let student = studentId
    ? await db.get("SELECT name, house FROM students WHERE id = ?", studentId)
    : null;

  if (!student) {
    response.writeHead(404, { "Content-Type": "text/html" });
    response.end("<h1>No student found</h1>\n");
    return;
  }

  let context = {
    student,
    houses: HOUSES,
  };

  if (request.method == "POST") {
    let body = "";

    request.on("data", function handleChunk(data) {
      body += data;
    });

    request.on("end", async function handleEnd() {
      let searchParams = new URLSearchParams(body);

      let studentName = searchParams.get("name");
      let studentHouse = searchParams.get("house");
      console.log({ studentName, studentHouse });

      let studentNameIsValid = studentName.length > 0;
      let studentHouseIsValid = HOUSES.includes(studentHouse);

      // it is possible that studentName and studentHouse already exist in db
      // in that case we should not try to update the db.

      if (studentNameIsValid && studentHouseIsValid) {
        try {
          await db.run(
            "UPDATE students SET name = ?, house = ? WHERE id = ?",
            studentName,
            studentHouse,
            studentId
          );
        } catch (err) {
          console.log(err.message);
          if (err.message.includes("UNIQUE constraint failed")) {
            let html = await renderTemplate("student-edit.html", {
              ...context,
              errors: {
                unique: "Student name and house are not unique",
              },
            });
            response.writeHead(400, { "Content-Type": "text/html" });
            response.end(html);
            return;
          }
        }
        response.writeHead(302, {
          Location: `http://${HOSTNAME}:${PORT}/students`,
        });
        response.end();
      } else {
        let html = await renderTemplate("student-edit.html", {
          ...context,
          errors: {
            name: studentNameIsValid ? undefined : "Name should not be empty",
            house: studentHouseIsValid ? undefined : "Invalid house",
          },
        });
        response.writeHead(400, { "Content-Type": "text/html" });
        response.end(html);
      }
    });
  } else {
    let html = await renderTemplate("student-edit.html", context);
    response.setHeader("Content-Type", "text/html");
    response.end(html);
  }
}

async function renderTemplate(name, context) {
  let templateStr = await fs.readFile(path.join("templates", name), "utf-8");
  let template = handlebars.compile(templateStr);
  let htmlStr = template(context);
  return htmlStr;
}

server.listen(PORT, HOSTNAME, function () {
  console.log(`🚀 Server running at http://${HOSTNAME}:${PORT}`);
});

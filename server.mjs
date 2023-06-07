import http from "http";
import url from "url";
import fs from "fs/promises";
import path from "path";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import handlebars from "handlebars";

var db = await open({
  filename: "hogwarts.db",
  driver: sqlite3.Database,
});

handlebars.registerHelper("select", function (selected, options) {
  console.log("selected", selected);
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

// var students = [
//   { name: "Harry", house: House.GRYFFINDOR },
//   { name: "Malfoy", house: House.SLYTHERIN },
//   { name: "Hermione", house: House.GRYFFINDOR },
//   { name: "Cedric", house: House.HUFFLEPUFF },
//   { name: "Luna", house: House.RAVENCLAW },
// ];

var HOUSES = Object.values(House);

var server = http.createServer(async function handleRequest(request, response) {
  var parsedURL = url.parse(request.url);

  switch (parsedURL.pathname) {
    case "/students": {
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

          response.statusCode = 302;
          response.setHeader("Location", "http://127.0.0.1:8000/students");
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

      break;
    }

    case "/students/delete": {
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

          response.statusCode = 302;
          response.setHeader("Location", "http://127.0.0.1:8000/students");
          response.end();
        });
      } else {
        response.statusCode = 405;
        response.end();
      }
      break;
    }

    // TODO: do this with path parameters instead of query parameters
    case "/students/change": {
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
            await db.run(
              "UPDATE students SET name = ?, house = ? WHERE id = ?",
              studentName,
              studentHouse,
              studentId
            );
          } else {
            response.statusCode = 400;
            response.setHeader("Content-Type", "text/html");
            response.end("<h1>Не правильные данные</h1>");
          }
        });
      }

      let searchParams = new URLSearchParams(parsedURL.query);
      let studentId = searchParams.get("id");
      let student;

      if (studentId) {
        student = await db.get(
          "SELECT name, house FROM students WHERE id = ?",
          studentId
        );
      }

      if (!student) {
        response.statusCode = 404;
        response.setHeader("Content-Type", "text/html");
        response.end("<h1>No student found</h1>");
      } else {
        let html = await renderTemplate("student-edit.html", {
          student,
          houses: HOUSES,
        });
        response.setHeader("Content-Type", "text/html");
        response.end(html);
      }

      break;
    }

    case "/hello": {
      let searchParams = new URLSearchParams(parsedURL.query);
      let name = searchParams.get("name") || "World";

      let html = await renderTemplate("students.html", { name: name });
      response.setHeader("Content-Type", "text/html");
      response.end(html);

      break;
    }
    default: {
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/html");
      response.end("<h1>Page not found!</h1>");
      break;
    }
  }
});

async function renderTemplate(name, context) {
  let templateStr = await fs.readFile(path.join("templates", name), "utf-8");
  let template = handlebars.compile(templateStr);
  let htmlStr = template(context);
  return htmlStr;
}

server.listen(8000);

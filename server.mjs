import http from "node:http";
import url from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { renderTemplate } from "./handlebars.mjs";
import { json, redirect } from "./utils.mjs";
import serveStatic from "./static.mjs";
import parseFormData from "./formData.mjs";
import Router from "./router.mjs";

const HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
const PORT = process.env.PORT || 8000;

var db = await open({
  filename: "hogwarts.db",
  driver: sqlite3.Database,
});

var server = http.createServer(async function handleRequest(req, res) {
  await router.handle(req, res);
});

var House = {
  GRYFFINDOR: "Gryffindor",
  SLYTHERIN: "Slytherin",
  HUFFLEPUFF: "Hufflepuff",
  RAVENCLAW: "Ravenclaw",
};

var HOUSES = Object.values(House);

var router = new Router();

router.use(function redirectTrailingSlash(req, res, next) {
  if (req.url.endsWith("/")) {
    redirect(req, res, req.url.slice(0, -1), 301);
  } else {
    next();
  }
});

router.use(serveStatic);
router.use(parseFormData);

router.get("/", function index(req, res) {
  redirect(req, res, "/students");
});

router.get("/students", async function studentList(req, res) {
  var parsedURL = url.parse(req.url);
  let searchParams = new URLSearchParams(parsedURL.query);
  let order = searchParams.get("order");

  let query = "SELECT id, name, house, image FROM students";

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

  res.writeHead(200, { "Content-Type": "text/html" }).end(html);
});

router.post("/students", async function studentCreate(req, res) {
  let studentName = req.formData.get("name");
  let studentHouse = req.formData.get("house");

  if (studentName && HOUSES.includes(studentHouse)) {
    let isUniqueStudent =
      (
        await db.get(
          "SELECT EXISTS(SELECT 1 FROM students WHERE name = ? AND house = ?) AS exists_",
          studentName,
          studentHouse
        )
      ).exists_ == 0;

    if (isUniqueStudent) {
      await db.run(
        "INSERT INTO students (name, house) VALUES (?, ?)",
        studentName,
        studentHouse
      );
    }
  }

  redirect(req, res, "/students");
});

router.post("/students/delete", async function studentDelete(req, res) {
  let studentId = req.formData.get("id");

  if (studentId) {
    await db.run("DELETE FROM students WHERE id = ?", studentId);
  }

  redirect(req, res, "/students");
});

router.all(
  "/students/:id/change",
  async function studentDetail(req, res, params) {
    let studentId = params.id;
    let student = studentId
      ? await db.get("SELECT name, house FROM students WHERE id = ?", studentId)
      : null;

    if (!student) {
      res
        .writeHead(404, { "Content-Type": "text/html" })
        .end("<h1>No student found</h1>\n");
      return;
    }

    let context = {
      student,
      houses: HOUSES,
    };

    if (req.method == "POST") {
      let studentName = req.formData.get("name");
      let studentHouse = req.formData.get("house");

      let studentNameIsValid = studentName.length > 0;
      let studentHouseIsValid = HOUSES.includes(studentHouse);

      if (studentNameIsValid && studentHouseIsValid) {
        try {
          await db.run(
            "UPDATE students SET name = ?, house = ? WHERE id = ?",
            studentName,
            studentHouse,
            studentId
          );
        } catch (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            let html = await renderTemplate("student-edit.html", {
              ...context,
              errors: {
                unique: "Student name and house are not unique",
              },
            });
            res.writeHead(400, { "Content-Type": "text/html" }).end(html);
            return;
          }
        }

        redirect(req, res, "/students");
      } else {
        let html = await renderTemplate("student-edit.html", {
          ...context,
          errors: {
            name: studentNameIsValid ? undefined : "Name should not be empty",
            house: studentHouseIsValid ? undefined : "Invalid house",
          },
        });
        res.writeHead(400, { "Content-Type": "text/html" }).end(html);
      }
    } else {
      let html = await renderTemplate("student-edit.html", context);
      res.writeHead(200, { "Content-Type": "text/html" }).end(html);
    }
  }
);

router.get("/students/download", async function studentsDownload(req, res) {
  const FIELD_NAMES = ["id", "name", "house"];
  let students = await db.all(`SELECT ${FIELD_NAMES.join(", ")} FROM students`);

  var csvStr = students
    .map(function (student) {
      return FIELD_NAMES.map(function (fieldName) {
        return student[fieldName];
      }).join(",");
    })
    .join("\n");

  res
    .writeHead(200, {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment;filename=students.csv",
    })
    .end(`${FIELD_NAMES.join(",")}\n${csvStr}\n`);
});

router.get("/students/search", async function studentsSearch(req, res) {
  let html = await renderTemplate("students-search.html");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

router.get("/api/students", async function studentsAPISearch(req, res) {
  var parsedURL = url.parse(req.url);
  let searchParams = new URLSearchParams(parsedURL.query);
  let search = searchParams.get("search");

  let students = await db.all(
    "SELECT name, house FROM students WHERE name LIKE ?",
    `%${search}%`
  );

  json(res, students);
});

router.get("/img/:image", async function studentsImage(req, res, params) {
  try {
    let img = await fs.readFile(path.join("images", params.image));
    res.end(img);
  } catch {
    res.writeHead(404).end();
  }
});

server.listen(PORT, HOSTNAME, function () {
  console.log(`🚀 Server running at http://${HOSTNAME}:${PORT}`);
});

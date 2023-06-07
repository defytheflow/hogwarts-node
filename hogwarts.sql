CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) > 0),
  house TEXT NOT NULL CHECK(house IN ('Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw')),
  UNIQUE(name, house)
);

INSERT INTO students (name, house) VALUES ('Harry', 'Gryffindor');
INSERT INTO students (name, house) VALUES ('Ron', 'Gryffindor');
INSERT INTO students (name, house) VALUES ('Hermione', 'Gryffindor');
INSERT INTO students (name, house) VALUES ('Draco', 'Slytherin');
INSERT INTO students (name, house) VALUES ('Cedric', 'Hufflepuff');
INSERT INTO students (name, house) VALUES ('Luna', 'Ravenclaw');
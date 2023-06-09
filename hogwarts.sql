CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) > 0),
  house TEXT NOT NULL CHECK(house IN ('Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw')),
  image TEXT NOT NULL, 
  UNIQUE(name, house)
);

INSERT INTO students (name, house, image) VALUES ('Harry', 'Gryffindor', 'harry.jpeg');
INSERT INTO students (name, house, image) VALUES ('Ron', 'Gryffindor', 'ron.jpg');
INSERT INTO students (name, house, image) VALUES ('Hermione', 'Gryffindor', 'hermione.jpeg');
INSERT INTO students (name, house, image) VALUES ('Draco', 'Slytherin', 'draco.jpeg');
INSERT INTO students (name, house, image) VALUES ('Cedric', 'Hufflepuff', 'cedric.jpeg');
INSERT INTO students (name, house, image) VALUES ('Luna', 'Ravenclaw', 'luna.jpeg');
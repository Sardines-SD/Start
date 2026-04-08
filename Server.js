
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let users = [];

app.post("/api/register", (req, res) => {
  const { email, password } = req.body;

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = { id: users.length + 1, email, password };
  users.push(newUser);

  console.log("User registered:", newUser);

  res.status(201).json(newUser);
});


app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  console.log("User logged in:", user);

  res.json(user);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
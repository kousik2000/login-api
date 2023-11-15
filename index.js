const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require('cors');

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(cors({ origin: 'https://camera-frontend.vercel.app' }));

const dbPath = path.join(__dirname, "data.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(9000, () => {
      console.log("Server Running at http://localhost:9000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

app.use(express.json());

app.get("/usersdata/", async (request, response) => {
    const getUsersQuery = `
      SELECT
        *
      FROM
        Users;`;
    const usersArray = await db.all(getUsersQuery);
    response.send(usersArray);
});

app.post("/signup/", async (request, response) => {
    console.log("Received request body:", request.body);
    const { Email, Password, Name, PrimaryMember } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.Password, 10);
    const selectUserQuery = `SELECT * FROM Users WHERE Email = '${Email}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          Users (Email, Password, Name, PrimaryMember) 
        VALUES 
          (
            '${Email}', 
            '${hashedPassword}', 
            '${Name}',
            '${PrimaryMember}'
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
        response.status(400).send("Email already exists");
    }
});

app.post("/login", async (request, response) => {
    const { Email, Password } = request.body;
    console.log(Email,Password,"from backend");
    const selectUserQuery = `SELECT * FROM Users WHERE Email = '${Email}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400).send({ error_msg: "Invalid User" });
    } else {
      const isPasswordMatched = await bcrypt.compare(Password, dbUser.Password);
      if (isPasswordMatched === true) {
        const payload = {
          Name: dbUser.Name,
          PrimaryMember: dbUser.PrimaryMember,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        const primaryMember = dbUser.PrimaryMember;
        const Name = dbUser.Name;
        response.send({ jwtToken, primaryMember, Name  });
      } else {
        response.status(400).send({ error_msg: "Invalid Password" });
      }
    }
});

app.post('/login',async (req,res)=>{
  const {Email,Password}= req.body;
  const getEmail = `SELECT * FROM  Users WHERE email= ${Email}`
  const dbUser = await db.get(getEmail);

  if (dbUser === undefined){
    res.send("Invalid User")
  }else{
    const isPasswordMatched = await bcrypt.compare(Password, dbUser.Password);
    if (isPasswordMatched===true){
      const payload = {
        Name: dbUser.name,
        PrimaryMember : dbUser.PrimaryMember
      }
      const jwtToken = jwt.sign(payload,"My_secret_token");
      const PrimaryMember = dbUser.PrimaryMember ;
      const Name = dbUser.Name
      res.send({jwtToken,PrimaryMember,Name})
    }else{
      res.send("Invalid Password")
    }
  }
})




initializeDBAndServer();

require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.static("public"));

const mysql = require("mysql2");

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
});

conn.connect(function(err) {
    if (err) {
        console.log("Couldnt connect to MySQL", err);
    } else {
        console.log("Database connection established");
    }
});

app.listen(3000);

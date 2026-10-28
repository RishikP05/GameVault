
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
});

conn.connect(function(err) {
    if (err) {
        console.log("Could not connect to MySQL", err);
    } else {
        console.log("Database connection established");
    }
});

// Registration
app.post("/register", async function(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).send("All fields are required.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const sql = `
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `;

        conn.query(sql,
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).send(
                            'Username or email already exists. ' +
                            '<a href="/register.html">Try again</a>'
                        );
                    }

                    return res.status(500).send(
                        "Registration failed."
                    );
                }

                res.send(
                    '<h2>You have successfully registered!</h2>' +
                    '<a href="/login.html">Go to Login</a>'
                );
            }
        );
    } catch (err) {
        res.status(500).send("Registration failed.");
    }
});

// Login
app.post("/login", function(req, res) {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";

    conn.query(sql, [username], async function(err, results) {
        if (err) {
            return res.status(500).send("Login failed.");
        }

        const invalidMessage =
            '<h2>The login credentials were incorrect.</h2>' +
            '<a href="/login.html">Back to Login</a>';

        if (results.length === 0) {
            return res.status(401).send(invalidMessage);
        }

        const user = results[0];

        try {
            const match = await bcrypt.compare(
                password, user.password_hash
            );

            if (!match) {
                return res.status(401).send(invalidMessage);
            }

            res.send(
                "<h2>You have logged in successfully!</h2>"
            );
        } catch (err) {
            res.status(401).send(invalidMessage);
        }
    });
});

app.listen(3000, function() {
    console.log("Server running at http://localhost:3000");
});

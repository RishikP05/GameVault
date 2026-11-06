
require("dotenv").config();

// Import packages needed for GameVault
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();

// Allow Express to read data from HTML forms
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Allow Express to access HTML, CSS, and JavaScript files
app.use(express.static("Public"));

// Parse cookies sent by the browser
app.use(cookieParser());

// Configure sessions to remember logged-in users
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60000 * 60, // Cookie lasts 1 hour
        httpOnly: true,     // Protects the session cookie from JavaScript
        secure: false       // Use false for localhost
    }
}));

// Connect to the GameVault MySQL database
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Check the database connection
conn.connect(function(err) {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Database connection established");
    }
});

// Registration route - creates a new user account
app.post("/register", async function(req, res) {
    const { username, email, password } = req.body;

    // Check that all required fields are entered
    if (!username || !email || !password) {
        return res.status(400).send("All fields are required.");
    }

    try {
        // Hash the password before storing it in MySQL
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert the new user into the users table
        const sql =
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";

        conn.query(
            sql,
            [username, email, passwordHash],
            function(err, result) {
                if (err) {
                    // Handle duplicate usernames or email addresses
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).send(
                            "<h2>Username or email already exists.</h2>" +
                            '<a href="/Register.html">Try Again</a>'
                        );
                    }

                    console.error("Registration error:", err);
                    return res.status(500).send("Registration failed.");
                }

                // Display a success message and login link
                res.send(
                    "<h2>You have successfully registered!</h2>" +
                    '<a href="/Login.html">Go to Login</a>'
                );
            }
        );
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).send("Registration failed.");
    }
});

// Login route - checks the user's username and password
app.post("/login", function(req, res) {
    const { username, password } = req.body;

    // Make sure both fields are filled in
    if (!username || !password) {
        return res.status(400).send(
            "Username and password are required."
        );
    }

    // Search for the username in the database
    const sql = "SELECT * FROM users WHERE username = ?";

    conn.query(sql, [username], async function(err, results) {
        if (err) {
            console.error("Login database error:", err);
            return res.status(500).send("Login failed.");
        }

        // Error message for incorrect login information
        const invalidMessage =
            "<h2>The login credentials were incorrect.</h2>" +
            '<a href="/Login.html">Back to Login</a>';

        // Check whether the username exists
        if (results.length === 0) {
            return res.status(401).send(invalidMessage);
        }

        const user = results[0];

        try {
            // Compare the password with the stored bcrypt hash
            const match = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!match) {
                return res.status(401).send(invalidMessage);
            }

            // Create a fresh session after successful login
            req.session.regenerate(function(err) {
                if (err) {
                    return res.status(500).send(
                        "Could not create login session."
                    );
                }

                // Store the logged-in user's ID and username
                req.session.user = {
                    user_id: user.user_id,
                    username: user.username
                };

                // Save the session before showing the profile link
                req.session.save(function(err) {
                    if (err) {
                        return res.status(500).send(
                            "Could not save session."
                        );
                    }

                    res.send(
                        "<h2>You have logged in successfully!</h2>" +
                        '<p>Visit your <a href="/profile">Profile</a></p>'
                    );
                });
            });
        } catch (err) {
            console.error("Password verification error:", err);
            res.status(500).send("An error occurred during login.");
        }
    });
});

// Escape HTML characters before displaying a username
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}

// Profile route - displays the username stored in the session
app.get("/profile", function(req, res) {

    // Prevent access if the user is not logged in
    if (!req.session.user) {
        return res.status(401).send(
            "<h2>You are not logged in.</h2>" +
            '<a href="/Login.html">Login Here</a>'
        );
    }

    // Retrieve the username from the active session
    const username = escapeHtml(req.session.user.username);

    // Display the profile and logout link
    res.send(
        "<h2>Welcome to your GameVault Profile!</h2>" +
        "<p>Username: " + username + "</p>" +
        '<p><a href="/logout">Logout</a></p>'
    );
});

// Logout route - destroys the user's active session
app.get("/logout", function(req, res) {

    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).send("Error logging out.");
        }

        // Clear the session cookie from the browser
        res.clearCookie("connect.sid");

        res.send(
            "<h2>You have logged out successfully!</h2>" +
            '<a href="/Login.html">Login Again</a>'
        );
    });
});
// Redirect visitors from the homepage to the login page
app.get("/", function(req, res) {
    res.redirect("/Login.html");
});

// Start the GameVault server on port 3000
app.listen(3000, function() {
    console.log("Server running at http://localhost:3000");
});


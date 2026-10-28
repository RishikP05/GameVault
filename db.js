
require("dotenv").config();
const mysql = require("mysql2/promise");

async function connectDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Successfully connected to GameVault!");

        const [rows] = await connection.execute(
            "SELECT user_id, username, email FROM users"
        );

        console.table(rows);

        await connection.end();
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exitCode = 1;
    }
}

connectDatabase();

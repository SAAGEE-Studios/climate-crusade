
const express = require('express'); // Imports Express, a Node.js framework
const sqlite3 = require('sqlite3').verbose(); // Imports SQLite
const cors = require('cors') // Enables Cross-Origin Resource Sharing
const bcrypt = require('bcrypt');

const app = express(); // Creates the Express application instance
const PORT = process.env.PORT || 3000; // Tells the server which port to run on

app.use(cors()); // Enables CORS for all routes. Without this, fetch() would fail in the browser
app.use(express.json()); // Tells Express an incoming request may contain json

// Database Connection
const db = new sqlite3.Database(
    './database/climatecrusade.db',
    (err) => {
        if (err){
            console.error('Database error: ', err);
        } else {
            console.log('Connected to SQLite database');
        }
    }
);

// Test Route
app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.post('/signup', async(req, res) => {
    const {username, email, password, date_of_birth} = req.body;

    if (!username || !email || !password || !date_of_birth) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
        INSERT INTO USERS (username, email, password_hash, date_of_birth)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [username, email, hashedPassword, date_of_birth], function (err) {
        if (err) {
            return res.status(400).json({
            error: err.message
            });
        }

        res.status(201).json({
            message: 'Account created successfully'
        });
    });
});

app.post('/login', async(req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM USERS WHERE username = ?';

    db.get(query, [username], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        res.json({
            message: 'Login successful',
            user_id: user.user_id
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
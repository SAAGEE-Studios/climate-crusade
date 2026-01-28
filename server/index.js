
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

app.post('/save-progress', async(req, res) => {
    const { user_id, level_id, stars_collected } = req.body;

    if (!user_id || !level_id || stars_collected == null) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    if (stars_collected < 0 || stars_collected > 3) {
        return res.status(400).json({
            error: 'Invalid star count'
        });
    }

    const query = `
        INSERT INTO LEVEL_PROGRESS (user_id, level_id, stars_collected)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, level_id)
        DO UPDATE SET stars_collected = MAX(stars_collected, excluded.stars_collected)
    `;

    db.run(query, [user_id, level_id, stars_collected], function (err) {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        res.status(200).json({
            message: 'Progress saved successfully'
        });
    });
});

app.get('/progress/:user_id', (req, res) => {
    const { user_id} = req.params;

    const query = `
        SELECT level_id, stars_collected
        FROM LEVEL_PROGRESS
        WHERE user_id = ?
    `;

    db.all(query, [user_id], (err, rows) => {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

    res.json({
      user_id: user_id,
      progress: rows
    });
  });
});

app.delete('/delete-account', (req, res) => {
    const {user_id, password} = req.params;

    if (!user_id || !password){
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    const findUserQuery = 'SELECT * FROM USERS WHERE user_id = ?';

    db.get(findUserQuery, [user_id], async(err, user) => {
        if (err || !user){
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({
                error: 'Invalid password'
            });
        }

        const deleteProgressQuery = 'DELETE FROM LEVEL_PROGRESS WHERE user_id = ?';

        db.run(deleteProgressQuery, [user_id], (err) => {
            if(err){
                return res.status(400).json({
                    error: err.message
                });
            }

            const deleteUserQuery = 'DELETE FROM USERS WHERE user_id = ?';

            db.run(deleteUserQuery, [user_id], (err) => {
                if (err) {
                    return res.status(400).json({
                        error: err.message
                    });
                }

                res.json({
                    message: 'Account deleted successfully'
                });
            });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
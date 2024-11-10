// Import required modules
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); // Allow all origins (use with caution in production)
// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for tracking login sessions
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// MySQL connection setup
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Connect to MySQL database
connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Database connected successfully!');
});

// Serve static files
app.use(express.static('public'));
// Middleware to check if the user is logged in and is an admin

function requireAdmin(req, res, next) {
    console.log('Session:', req.session); // Log the session for debugging
    if (req.session && req.session.user) {
        console.log('User Role ID:', req.session.user.role_id); // Log the role ID
        if (req.session.user.role_id === 2) { // Assuming role_id 2 is for admin
            return next(); // Proceed if the user is an admin
        }
    }
    // If access is denied, respond with a JSON error
    return res.status(403).json({ error: 'Access denied. Admins only.' });
}






// Signup route
app.post('/signup', async (req, res) => {
    const { username, email, password, role_id } = req.body;

    // Validate input
    if (!username || !email || !password || !role_id) {
        return res.status(400).send('All fields are required');
    }

    try {
        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database with role_id
        const query = `INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)`;
        connection.query(query, [username, email, hashedPassword, role_id], (err, results) => {
            if (err) {
                console.error('Error during signup:', err);
                return res.status(500).send('Error during signup');
            } 
            // Redirect to login page after successful signup
            res.redirect('/login'); // Assuming '/login' is your login route
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Error during signup');
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html'); // Adjust the path as necessary
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Query to find user by username
    const query = `SELECT * FROM users WHERE username = ?`;
    connection.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return res.status(500).send('Error during login');
        } else if (results.length === 0) {
            return res.status(400).send('User not found');
        } 

        const user = results[0];

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            // Set user session with role_id
            req.session.user = { id: user.id, username: user.username, role_id: user.role_id };
            res.send('Login successful');
        } else {
            res.status(400).send('Incorrect password');
        }
    });
});



// Route to add a new committee (admin only)
app.post('/add-committee', requireAdmin, (req, res) => {
    const { name, description } = req.body;

    // Validate input
    if (!name || !description) {
        return res.status(400).json({ success: false, message: 'Name and description are required' });
    }

    const query = `INSERT INTO committees (name, description) VALUES (?, ?)`;
    connection.query(query, [name, description], (err, results) => {
        if (err) {
            console.error('Error adding committee:', err);
            return res.status(500).json({ success: false, message: 'Error adding committee' });
        } 
        res.status(201).json({ success: true, message: 'Committee added successfully', id: results.insertId });
    });
});

// Serve the update committee page (admin only)
app.get('/update-committee/:committee_id', requireAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/update-committee.html'); // Adjust path if needed
});

// Route to get a specific committee's details
app.get('/committees/:committee_id', requireAdmin, (req, res) => {
    const { committee_id } = req.params;
    const query = `SELECT * FROM committees WHERE committee_id = ?`;
    connection.query(query, [committee_id], (err, results) => {
        if (err) {
            console.error('Error fetching committee details:', err);
            return res.status(500).send('Error fetching committee details');
        } 
        if (results.length === 0) {
            return res.status(404).send('Committee not found');
        }
        res.json(results[0]); // Send the committee details
    });
});
// Route to update a committee (admin only)
// Route to update a committee (admin only)
app.put('/update-committee/:committee_id', requireAdmin, (req, res) => {
    const { committee_id } = req.params;
    const { name, description } = req.body;

    // Validate input
    if (!name || !description) {
        return res.status(400).json({ success: false, message: 'Name and description are required' });
    }

    const query = `UPDATE committees SET name = ?, description = ? WHERE committee_id = ?`;
    connection.query(query, [name, description, committee_id], (err, results) => {
        if (err) {
            console.error('Error updating committee:', err);
            return res.status(500).json({ success: false, message: 'Error updating committee' });
        }
        // Return updated committee details
        res.json({ success: true, message: 'Committee updated successfully', updatedCommittee: { committee_id, name, description } });
    });
});




// Route to delete a committee (admin only)
app.delete('/delete-committee/:committee_id', requireAdmin, (req, res) => {
    const { committee_id } = req.params;

    if (!committee_id) {
        return res.status(400).json({ success: false, message: 'Committee ID is required' });
    }

    const checkQuery = `SELECT * FROM committees WHERE committee_id = ?`;
    connection.query(checkQuery, [committee_id], (err, results) => {
        if (err) {
            console.error('Error checking committee existence:', err);
            return res.status(500).json({ success: false, message: 'Error checking committee' });
        } 
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Committee not found' });
        }

        const deleteQuery = `DELETE FROM committees WHERE committee_id = ?`;
        connection.query(deleteQuery, [committee_id], (err) => {
            if (err) {
                console.error('Error deleting committee:', err);
                return res.status(500).json({ success: false, message: 'Error deleting committee' });
            }
            res.json({ success: true, message: 'Committee deleted successfully' });
        });
    });
});

// Route to view all committees (accessible to all users)
app.get('/committees', (req, res) => {
    const query = `SELECT * FROM committees`;
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching committees:', err);
            res.status(500).send('Error fetching committees');
        } else {
            res.json(results);
        }
    });
});

// Serve the dashboard route
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(__dirname + '/public/dashboard.html'); // Adjust path if needed
    } else {
        res.status(401).send('You need to log in to access this page');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Logout failed');
        }
        res.send('Logged out successfully');
    });
});
// Route to view a specific committee's details
app.get('/committees/:committee_id', (req, res) => {
    const { committee_id } = req.params;
    const query = `SELECT * FROM committees WHERE committee_id = ?`;
    connection.query(query, [committee_id], (err, results) => {
        if (err) {
            console.error('Error fetching committee details:', err);
            return res.status(500).send('Error fetching committee details');
        } 
        if (results.length === 0) {
            return res.status(404).send('Committee not found');
        }
        res.json(results[0]); // Send the committee details
    });
});
app.get('/committees/:committee_id/events', (req, res) => {
    const { committee_id } = req.params;
    const query = `SELECT * FROM events WHERE committee_id = ?`;
    connection.query(query, [committee_id], (err, results) => {
        if (err) {
            console.error('Error fetching events:', err);
            return res.status(500).send('Error fetching events');
        }
        res.json(results);
    });
});
app.post('/committees/:committeeId/events', requireAdmin, (req, res) => {
    const { committeeId } = req.params;
    const { event_name, event_date, location } = req.body;

    // Validate input
    if (!event_name || !event_date || !location) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const query = `INSERT INTO Events (committee_id, event_name, event_date, location) VALUES (?, ?, ?, ?)`;
    connection.query(query, [committeeId, event_name, event_date, location], (err, results) => {
        if (err) {
            console.error('Error adding event:', err);
            return res.status(500).json({ success: false, message: 'Error adding event' });
        }
        res.status(201).json({ success: true, message: 'Event added successfully', id: results.insertId });
    });
});
function deleteEvent(committeeId, eventId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM Events WHERE event_id = ? AND committee_id = ?';
        connection.query(query, [eventId, committeeId], (error, results) => {
            if (error) {
                return reject(error);
            }
            if (results.affectedRows === 0) {
                return reject(new Error('Event not found')); // Handle if no rows were affected
            }
            resolve(results);
        });
    });
}
app.delete('/committees/:committeeId/events/:eventId',requireAdmin, async (req, res) => {
    const { committeeId, eventId } = req.params;
    try {
        await deleteEvent(committeeId, eventId);
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        if (error.message === 'Event not found') {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});




// Endpoint to get members of a committee
app.get('/committees/:committee_id/members', (req, res) => {
    const committee_id = req.params.committee_id;
    const query = `
        SELECT Users.user_id, Users.username, Memberships.position AS position
        FROM Memberships
        JOIN Users ON Memberships.user_id = Users.user_id
        JOIN Roles ON Memberships.role_id = Roles.role_id
        WHERE Memberships.committee_id = ?
    `;

    connection.query(query, [committee_id], (error, results) => {
        if (error) {
            console.error('Error fetching members:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.json(results);
    });
});




// Endpoint to add a member to a committee
app.post('/committees/:committee_id/members',requireAdmin, (req, res) => {
    
    
    const committee_id = req.params.committee_id;
    
    const { username, password, position } = req.body; // Make sure to get 'position' but remove 'role' since we now determine role_id based on the username and password

    // Step 1: Find the user based on username and password
    const findUserQuery = 'SELECT user_id, password FROM Users WHERE username = ?';
connection.query(findUserQuery, [username], (error, userResults) => {
    if (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if (userResults.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    const userId = userResults[0].user_id;
    const hashedPassword = userResults[0].password; // Fetch the hashed password

    // Step 2: Compare the entered password with the hashed password
    bcrypt.compare(password, hashedPassword, (err, result) => {
        if (err) {
            console.error('Error comparing passwords:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (!result) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        
        
    });
        // Step 2: Determine the role based on the user or your business logic
        // Assuming you have a way to fetch role_id based on user_id, here's an example
        const getRoleQuery = 'SELECT role_id FROM Users WHERE user_id = ?'; // Example table where you map users to roles
        
        connection.query(getRoleQuery, [userId], (error, roleResults) => {
            if (error) {
                console.error('Error fetching role:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
            
            if (roleResults.length === 0) {
                return res.status(404).json({ message: 'Role not found for user' });
            }
            
            const roleId = roleResults[0].role_id; // Get role_id for the user

            // Step 3: Insert the new member into the Memberships table, including the 'position'
            const insertMembershipQuery = `
                INSERT INTO Memberships (user_id, committee_id, role_id, position) 
                VALUES (?, ?, ?, ?)`;
            
            connection.query(insertMembershipQuery, [userId, committee_id, roleId, position], (error, results) => {
                if (error) {
                    console.error('Error adding member:', error);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                
                res.status(201).json({ message: 'Member added successfully', membership_id: results.insertId });
            });
        });
    });
});


// Endpoint to remove a member from a committee
app.delete('/committees/:committeeId/members/:userId',requireAdmin, (req, res) => {
    const committeeId = req.params.committeeId;
    const userId = req.params.userId;

    const query = 'DELETE FROM Memberships WHERE committee_id = ? AND user_id = ?';
    connection.query(query, [committeeId, userId], (error, results) => {
        if (error) {
            console.error('Error removing member:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.json({ message: 'Member removed successfully' });
    });
});

app.get('/committees/:committee_id/announcements',(req, res) => {
    const { committee_id } = req.params;
    const query = `SELECT announcement_id, title, description, DATE(announcement_date) AS announcement_date FROM announcements WHERE committee_id = ?`;
    connection.query(query, [committee_id], (err, results) => {
        if (err) {
            console.error('Error fetching announcements:', err);
            return res.status(500).send('Error fetching announcements');
        }
        res.json(results);
    });
});


// Add a new announcement to a committee
app.post('/committees/:committee_id/announcements',requireAdmin, (req, res) => {
    const { committee_id } = req.params;
    const { title, description } = req.body;
    const announcement_date = new Date().toISOString().split('T')[0]; // Current date

    const query = `
        INSERT INTO Announcements (committee_id, title, description, announcement_date)
        VALUES (?, ?, ?, ?)
    `;
    
    connection.query(query, [committee_id, title, description, announcement_date], (err, result) => {
        if (err) {
            console.error('Error adding announcement:', err);
            return res.status(500).json({ message: 'Error adding announcement' });
        }
        res.json({ message: 'Announcement added successfully', announcement_id: result.insertId });
    });
});

// Delete an announcement from a committee
app.delete('/committees/:committee_id/announcements/:announcement_id',requireAdmin, (req, res) => {
    const { committee_id, announcement_id } = req.params;
    const query = 'DELETE FROM Announcements WHERE announcement_id = ? AND committee_id = ?';
    
    connection.query(query, [announcement_id, committee_id], (error, results) => {
        if (error) {
            console.error('Error deleting announcement:', error);
            return res.status(500).send('Error deleting announcement');
        }
        res.sendStatus(204); // No content
    });
});
// Assuming you have already set up Express and a MySQL connection (db)
app.get('/committees/count', async (req, res) => {
    try {
        const [results] = connection.execute('SELECT COUNT(*) AS count FROM committees');
        const count = results[0].count;
        res.json({ count });
    } catch (error) {
        console.error('Error fetching committee count:', error);
        res.status(500).json({ error: 'Error fetching committee count' });
    }
});


// Start the server
app.listen(PORT, () => {
    
    console.log(`Server is running on http://localhost:${PORT}`);
});
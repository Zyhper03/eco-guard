const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'eco_guard'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected...');
});

// POST - Join Mission
app.post('/api/join', (req, res) => {
  const { name, email, phone } = req.body;
  db.query(
    'INSERT INTO join_mission (name, email, phone) VALUES (?, ?, ?)',
    [name, email, phone],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'You have successfully joined the mission!' });
    }
  );
});

// POST - Add Eco Report
app.post('/api/report', (req, res) => {
  const { description, location, image } = req.body;
  db.query(
    'INSERT INTO eco_reports (description, location, image) VALUES (?, ?, ?)',
    [description, location, image],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Eco Report submitted successfully!' });
    }
  );
});

//  NEW: GET - Fetch all Eco Reports
app.get('/api/reports', (req, res) => {
  db.query('SELECT * FROM eco_reports ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('Error fetching reports:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Serve frontend
app.use(express.static(__dirname));

// Start server
app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
// const express = require('express');
// const mysql = require('mysql2');
// const cors = require('cors');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'eco_guard'
// });

// db.connect(err => {
//   if (err) throw err;
//   console.log('MySQL Connected...');
// });

// app.post('/api/join', (req, res) => {
//   const { name, email, phone } = req.body;
//   db.query(
//     'INSERT INTO join_mission (name, email, phone) VALUES (?, ?, ?)',
//     [name, email, phone],
//     (err) => {
//       if (err) return res.status(500).json({ error: err });
//       res.json({ message: 'You have successfully joined the mission!' });
//     }
//   );
// });

// app.post('/api/report', (req, res) => {
//   const { description, location, image } = req.body;
//   db.query(
//     'INSERT INTO eco_reports (description, location, image) VALUES (?, ?, ?)',
//     [description, location, image],
//     (err) => {
//       if (err) return res.status(500).json({ error: err });
//       res.json({ message: 'Eco Report submitted successfully!' });
//     }
//   );
// });

// app.use(express.static(__dirname));
// app.listen(3000, () => console.log('Server running on http://localhost:3000'));

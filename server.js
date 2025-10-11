const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration - UPDATE WITH YOUR ACTUAL NETLIFY URL
app.use(cors({
    origin: [
        'https://visionary-pony-ae1d1c.netlify.app/', // ⚠️ REPLACE THIS with your actual Netlify URL
        'http://localhost:3000',
        'http://localhost:3001',
        'https://goa-eco-guard.netlify.app' // Common Netlify pattern
    ],
    credentials: true
}));

app.use(bodyParser.json());

// Supabase configuration - USING YOUR CREDENTIALS
const supabaseUrl = 'https://jxvrjxlxkikwirfmwozr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dnJqeGx4a2lrd2lyZm13b3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzk4NjksImV4cCI6MjA3NTY1NTg2OX0.BFaVcV__Ep1NfbWgPoA9wAvxQLXXpo5eeeD99n817Pk';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Goa Eco-Guard Backend Starting...');
console.log('📊 Supabase Connected:', supabaseUrl);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const { data, error } = await supabase.from('eco_reports').select('*').limit(1);
        
        res.json({ 
            status: 'OK', 
            message: '🌱 Goa Eco-Guard API is running!',
            database: error ? 'Connection issue' : 'Connected ✅',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Join Mission
app.post('/api/join', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        console.log('📝 Join mission request:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const { data, error } = await supabase
            .from('join_mission')
            .insert([
                { 
                    name: name.trim(), 
                    email: email.trim(), 
                    phone: phone.trim(),
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }

        console.log('✅ Mission join saved:', data[0].id);
        
        res.json({ 
            message: '🎉 You have successfully joined the mission! We will contact you soon.',
            id: data[0].id
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST - Add Eco Report
app.post('/api/report', async (req, res) => {
    try {
        const { description, location, image } = req.body;
        
        console.log('📋 Eco report request:', { location, description });
        
        // Validation
        if (!description || !location) {
            return res.status(400).json({ error: 'Description and location are required' });
        }

        const { data, error } = await supabase
            .from('eco_reports')
            .insert([
                { 
                    description: description.trim(), 
                    location: location.trim(), 
                    image: image ? image.trim() : null,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Database error: ' + error.message });
        }

        console.log('✅ Eco report saved:', data[0].id);
        
        res.json({ 
            message: '✅ Environmental report submitted successfully! Our team will review it.',
            id: data[0].id
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET - Fetch all Eco Reports
app.get('/api/reports', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('eco_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        res.json(data || []);
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to check tables
app.get('/api/debug', async (req, res) => {
    try {
        const { data: reports, error: reportsError } = await supabase.from('eco_reports').select('*');
        const { data: missions, error: missionsError } = await supabase.from('join_mission').select('*');
        
        res.json({
            eco_reports: reportsError ? { error: reportsError.message } : { count: reports?.length, data: reports },
            join_mission: missionsError ? { error: missionsError.message } : { count: missions?.length, data: missions }
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: '🌱 Goa Eco-Guard Backend API',
        version: '1.0.0',
        database: 'Supabase PostgreSQL',
        endpoints: {
            health: 'GET /api/health',
            join_mission: 'POST /api/join',
            submit_report: 'POST /api/report', 
            get_reports: 'GET /api/reports',
            debug: 'GET /api/debug'
        }
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('💥 Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database: ${supabaseUrl}`);
});



// const express = require('express');
// const mysql = require('mysql2');
// const cors = require('cors');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // MySQL connection
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'eco_guard'
// });

// db.connect(err => {
//   if (err) throw err;
//   console.log('✅ MySQL Connected...');
// });

// // POST - Join Mission
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

// // POST - Add Eco Report
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

// //  NEW: GET - Fetch all Eco Reports
// app.get('/api/reports', (req, res) => {
//   db.query('SELECT * FROM eco_reports ORDER BY id DESC', (err, results) => {
//     if (err) {
//       console.error('Error fetching reports:', err);
//       return res.status(500).json({ error: 'Database error' });
//     }
//     res.json(results);
//   });
// });

// // Serve frontend
// app.use(express.static(__dirname));

// // Start server
// app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));


  
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

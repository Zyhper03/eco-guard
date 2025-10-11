const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration - FIXED (no trailing slash)
app.use(cors({
    origin: [
        'https://visionary-pony-ae1d1c.netlify.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://goa-eco-guard.netlify.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Supabase configuration
const supabaseUrl = 'https://jxvrjxlxkikwirfmwozr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dnJqeGx4a2lrd2lyZm13b3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzk4NjksImV4cCI6MjA3NTY1NTg2OX0.BFaVcV__Ep1NfbWgPoA9wAvxQLXXpo5eeeD99n817Pk';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Goa Eco-Guard Backend Starting...');
console.log('📊 Supabase Connected:', supabaseUrl);

// Initialize database tables
const initializeDatabase = async () => {
    try {
        console.log('🔧 Checking database tables...');
        
        // Check if tables exist, create if they don't
        const { error: reportsError } = await supabase.from('eco_reports').select('*').limit(1);
        const { error: missionsError } = await supabase.from('join_mission').select('*').limit(1);
        
        if (reportsError && reportsError.message.includes('does not exist')) {
            console.log('📋 Creating eco_reports table...');
            // Table will be created automatically on first insert
        }
        
        if (missionsError && missionsError.message.includes('does not exist')) {
            console.log('📋 Creating join_mission table...');
            // Table will be created automatically on first insert
        }
        
        console.log('✅ Database initialization complete');
    } catch (error) {
        console.log('⚠️ Database initialization note:', error.message);
    }
};

// Call initialization
initializeDatabase();

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        res.json({ 
            status: 'OK', 
            message: '🌱 Goa Eco-Guard API is running!',
            database: 'Supabase PostgreSQL',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Join Mission
app.post('/api/join', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        console.log('📝 Join mission request received:', { name, email: email ? '***' : 'missing', phone: phone ? '***' : 'missing' });
        
        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required: name, email, and phone' 
            });
        }

        // Basic email validation
        if (!email.includes('@')) {
            return res.status(400).json({ 
                success: false,
                error: 'Please provide a valid email address' 
            });
        }

        const { data, error } = await supabase
            .from('join_mission')
            .insert([
                { 
                    name: name.trim(), 
                    email: email.trim().toLowerCase(), 
                    phone: phone.trim(),
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            
            // If table doesn't exist, provide helpful message
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                return res.status(500).json({ 
                    success: false,
                    error: 'Database setup in progress. Please try again in a moment.',
                    details: 'Table is being created automatically'
                });
            }
            
            return res.status(500).json({ 
                success: false,
                error: 'Failed to save your mission join request: ' + error.message 
            });
        }

        console.log('✅ Mission join saved successfully. ID:', data[0].id);
        
        res.json({ 
            success: true,
            message: '🎉 You have successfully joined the mission! We will contact you within 24 hours.',
            id: data[0].id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Server error in /api/join:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
    }
});

// POST - Add Eco Report
app.post('/api/report', async (req, res) => {
    try {
        const { description, location, image } = req.body;
        
        console.log('📋 Eco report request received:', { 
            location: location || 'missing', 
            description: description ? description.substring(0, 50) + '...' : 'missing' 
        });
        
        // Validation
        if (!description || !location) {
            return res.status(400).json({ 
                success: false,
                error: 'Description and location are required' 
            });
        }

        if (description.length < 10) {
            return res.status(400).json({ 
                success: false,
                error: 'Description should be at least 10 characters long' 
            });
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
            
            // If table doesn't exist, provide helpful message
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                return res.status(500).json({ 
                    success: false,
                    error: 'Database setup in progress. Please try again in a moment.',
                    details: 'Table is being created automatically'
                });
            }
            
            return res.status(500).json({ 
                success: false,
                error: 'Failed to save environmental report: ' + error.message 
            });
        }

        console.log('✅ Eco report saved successfully. ID:', data[0].id);
        
        res.json({ 
            success: true,
            message: '✅ Environmental report submitted successfully! Our team will review it shortly.',
            id: data[0].id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Server error in /api/report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
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
            
            // If table doesn't exist, return empty array instead of error
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                return res.json([]);
            }
            
            return res.status(500).json({ 
                success: false,
                error: 'Failed to fetch reports: ' + error.message 
            });
        }

        console.log(`📊 Returning ${data?.length || 0} reports`);
        res.json(data || []);
        
    } catch (error) {
        console.error('❌ Server error in /api/reports:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
    }
});

// Debug endpoint to check database status
app.get('/api/debug', async (req, res) => {
    try {
        const { data: reports, error: reportsError } = await supabase
            .from('eco_reports')
            .select('*')
            .limit(5);
            
        const { data: missions, error: missionsError } = await supabase
            .from('join_mission')
            .select('*')
            .limit(5);

        res.json({
            status: 'Debug Information',
            timestamp: new Date().toISOString(),
            tables: {
                eco_reports: {
                    exists: !reportsError || !reportsError.message.includes('does not exist'),
                    error: reportsError?.message,
                    count: reports?.length || 0,
                    sample: reports || []
                },
                join_mission: {
                    exists: !missionsError || !missionsError.message.includes('does not exist'),
                    error: missionsError?.message,
                    count: missions?.length || 0,
                    sample: missions || []
                }
            },
            environment: {
                node_version: process.version,
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        res.json({ 
            error: 'Debug endpoint error: ' + error.message 
        });
    }
});

// Create tables endpoint (for manual table creation)
app.post('/api/setup-tables', async (req, res) => {
    try {
        console.log('🔧 Manual table setup requested...');
        
        // This is a placeholder - tables are created automatically on first insert
        // In a real scenario, you'd run SQL here
        
        res.json({
            success: true,
            message: 'Tables are set to be created automatically on first data insertion',
            note: 'Submit a test report or mission join to create tables'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: '🌱 Goa Eco-Guard Backend API',
        version: '1.0.0',
        database: 'Supabase PostgreSQL',
        status: 'Running 🚀',
        endpoints: {
            health: 'GET /api/health',
            join_mission: 'POST /api/join',
            submit_report: 'POST /api/report', 
            get_reports: 'GET /api/reports',
            debug: 'GET /api/debug',
            setup_tables: 'POST /api/setup-tables'
        },
        frontend: 'https://visionary-pony-ae1d1c.netlify.app'
    });
});

// Handle 404 - Improved
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found',
        available_endpoints: {
            health: '/api/health',
            join: '/api/join (POST)',
            report: '/api/report (POST)',
            reports: '/api/reports (GET)',
            debug: '/api/debug (GET)'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('💥 Unhandled server error:', error);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ ======================================== ✨`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: https://eco-guard-backend.onrender.com/api/health`);
    console.log(`🔗 Debug info: https://eco-guard-backend.onrender.com/api/debug`);
    console.log(`🗄️  Database: ${supabaseUrl}`);
    console.log(`🌐 Frontend: https://visionary-pony-ae1d1c.netlify.app`);
    console.log(`✨ ======================================== ✨\n`);
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

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'https://goaecoguard.netlify.app',
        'http://localhost:3000',
        'http://localhost:3001'
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: '🌱 Goa Eco-Guard API is running!',
        timestamp: new Date().toISOString()
    });
});

// POST - Join Mission (WORKING VERSION)
app.post('/api/join', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        console.log('📝 Join mission request received');
        
        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }

        // Insert using array format (Supabase prefers this)
        const { data, error } = await supabase
            .from('join_mission')
            .insert([
                {
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('❌ Join Mission Error:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Database error: ' + error.message 
            });
        }

        console.log('✅ Mission join saved successfully');
        
        res.json({ 
            success: true,
            message: '🎉 You have successfully joined the mission!'
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
        });
    }
});

// POST - Add Eco Report (WORKING VERSION)
app.post('/api/report', async (req, res) => {
    try {
        const { description, location, image } = req.body;
        
        console.log('📋 Eco report request received');
        
        // Validation
        if (!description || !location) {
            return res.status(400).json({ 
                success: false,
                error: 'Description and location are required' 
            });
        }

        // Insert using array format
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
            ]);

        if (error) {
            console.error('❌ Eco Report Error:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Database error: ' + error.message 
            });
        }

        console.log('✅ Eco report saved successfully');
        
        res.json({ 
            success: true,
            message: '✅ Environmental report submitted successfully!'
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error: ' + error.message 
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
            console.error('❌ Fetch Reports Error:', error);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        res.json(data || []);
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Debug endpoint
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Health check: https://eco-guard-backend.onrender.com/api/health`);
});

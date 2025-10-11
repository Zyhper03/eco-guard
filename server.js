const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'https://visionary-pony-ae1d1c.netlify.app',
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
console.log('📊 Supabase Connected');

// Health check
app.get('/api/health', async (req, res) => {
    try {
        res.json({ 
            status: 'OK', 
            message: '🌱 Goa Eco-Guard API is running!',
            database: 'Supabase PostgreSQL',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Join Mission (FIXED)
app.post('/api/join', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        console.log('📝 Join mission request:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required: name, email, and phone' 
            });
        }

        // Insert data - SIMPLIFIED without .select()
        const { data, error } = await supabase
            .from('join_mission')
            .insert({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to save mission join: ' + error.message 
            });
        }

        console.log('✅ Mission join saved successfully');
        
        res.json({ 
            success: true,
            message: '🎉 You have successfully joined the mission! We will contact you soon.'
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
    }
});

// POST - Add Eco Report (FIXED)
app.post('/api/report', async (req, res) => {
    try {
        const { description, location, image } = req.body;
        
        console.log('📋 Eco report request:', { location, description });
        
        // Validation
        if (!description || !location) {
            return res.status(400).json({ 
                success: false,
                error: 'Description and location are required' 
            });
        }

        // Insert data - SIMPLIFIED without .select()
        const { data, error } = await supabase
            .from('eco_reports')
            .insert({
                description: description.trim(),
                location: location.trim(),
                image: image ? image.trim() : null,
                status: 'pending',
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to save report: ' + error.message 
            });
        }

        console.log('✅ Eco report saved successfully');
        
        res.json({ 
            success: true,
            message: '✅ Environmental report submitted successfully! Our team will review it.'
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
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
            return res.status(500).json({ 
                success: false,
                error: 'Failed to fetch reports: ' + error.message 
            });
        }

        console.log(`📊 Returning ${data?.length || 0} reports`);
        res.json(data || []);
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
    }
});

// Debug endpoint to check tables and data
app.get('/api/debug', async (req, res) => {
    try {
        const { data: reports, error: reportsError } = await supabase
            .from('eco_reports')
            .select('*');
            
        const { data: missions, error: missionsError } = await supabase
            .from('join_mission')
            .select('*');

        res.json({
            status: 'Debug Information',
            tables: {
                eco_reports: {
                    exists: !reportsError,
                    error: reportsError?.message,
                    count: reports?.length || 0,
                    data: reports || []
                },
                join_mission: {
                    exists: !missionsError,
                    error: missionsError?.message,
                    count: missions?.length || 0,
                    data: missions || []
                }
            }
        });
    } catch (error) {
        res.json({ error: 'Debug error: ' + error.message });
    }
});

// Test insert endpoint
app.post('/api/test-insert', async (req, res) => {
    try {
        // Test join_mission insert
        const { data: missionData, error: missionError } = await supabase
            .from('join_mission')
            .insert({
                name: 'Test User',
                email: 'test@example.com',
                phone: '1234567890',
                created_at: new Date().toISOString()
            });

        // Test eco_reports insert
        const { data: reportData, error: reportError } = await supabase
            .from('eco_reports')
            .insert({
                description: 'Test pollution report',
                location: 'Test Beach',
                image: null,
                status: 'pending',
                created_at: new Date().toISOString()
            });

        res.json({
            mission_insert: missionError ? { error: missionError.message } : { success: true },
            report_insert: reportError ? { error: reportError.message } : { success: true }
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
        status: 'Running ',
        endpoints: {
            health: 'GET /api/health',
            join_mission: 'POST /api/join',
            submit_report: 'POST /api/report', 
            get_reports: 'GET /api/reports',
            debug: 'GET /api/debug',
            test_insert: 'POST /api/test-insert'
        }
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available_endpoints: ['/api/health', '/api/join', '/api/report', '/api/reports', '/api/debug']
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error(' Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error: ' + error.message 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 URL: https://eco-guard-backend.onrender.com`);
});
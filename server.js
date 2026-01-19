require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();

/* ===============================
   BASIC MIDDLEWARE
================================ */
// In your backend server.js
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5502',
    'http://localhost:3000',
    'http://localhost:5501',  // Add if using different port
    'file://'                 // Add if opening HTML file directly
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/login', express.static(path.join(__dirname, 'login')));
app.use(express.static(path.join(__dirname)));

/* ===============================
   SUPABASE
================================ */
// Public client (for reads, subject to RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Service role client (for writes, bypasses RLS)
// Use SUPABASE_SERVICE_ROLE_KEY from .env if available, otherwise fall back to SUPABASE_KEY
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

/* ===============================
   MULTER (IMAGE UPLOAD)
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ===============================
   AUTH MIDDLEWARE
================================ */
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
};

/* ===============================
   HEALTH
================================ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Test Supabase connection and table access
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Missing');

    // Test 1: Check if we can access eco_reports table
    const { data: reportsData, error: reportsError, count: reportsCount } = await supabase
      .from('eco_reports')
      .select('*', { count: 'exact', head: true });

    // Test 2: Check if we can access eco_spots (which seems to work)
    const { data: spotsData, error: spotsError } = await supabase
      .from('eco_spots')
      .select('id')
      .limit(1);

    // Test 3: Try a simple query on eco_reports to see what columns exist
    const { data: testQuery, error: testError } = await supabase
      .from('eco_reports')
      .select('*')
      .limit(1);

    // Test 4: Try to get table structure by attempting different column names
    const columnTests = {};
    const possibleColumns = ['user_id', 'userId', 'created_by', 'reporter_id', 'user'];

    for (const col of possibleColumns) {
      try {
        const { error: colError } = await supabase
          .from('eco_reports')
          .select(col)
          .limit(0);
        columnTests[col] = !colError;
      } catch (e) {
        columnTests[col] = false;
      }
    }

    res.json({
      connection: 'OK',
      supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
      supabaseKey: process.env.SUPABASE_KEY ? 'Configured' : 'Missing',
      tables: {
        eco_reports: {
          accessible: !reportsError,
          error: reportsError?.message || null,
          totalCount: reportsCount || 0,
          sampleData: testQuery || [],
          testError: testError?.message || null,
          columnTests: columnTests
        },
        eco_spots: {
          accessible: !spotsError,
          error: spotsError?.message || null,
          hasData: spotsData && spotsData.length > 0
        }
      }
    });
  } catch (err) {
    res.json({
      connection: 'ERROR',
      error: err.message,
      stack: err.stack
    });
  }
});

/* ===============================
   AUTH (COMMON LOGIN)
================================ */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ name, email, password: hashed, phone }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const token = jwt.sign(
    { userId: data.id, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  delete data.password;
  res.json({ token, user: data });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  delete user.password;
  res.json({ token, user });
});

/* ===============================
   USER ROUTES
================================ */
app.post(
  '/api/report',
  authenticateToken,
  upload.single('image'),
  async (req, res) => {
    try {
      console.log('📝 Report submission received');
      console.log('User:', req.user.userId, 'Role:', req.user.role);

      if (req.user.role !== 'user') {
        console.warn('⚠️ Non-user tried to submit report');
        return res.status(403).json({ error: 'Users only' });
      }

      const { location, description, latitude, longitude } = req.body;
      console.log('Report data:', { location, description, latitude, longitude, hasImage: !!req.file });

      if (!latitude || !longitude) {
        console.warn('⚠️ Missing location data');
        return res.status(400).json({ error: 'Location required' });
      }

      let imageName = null;

      if (req.file) {
        try {
          imageName = `report-${Date.now()}.jpg`;
          const outPath = `uploads/${imageName}`;
          console.log('Processing image:', req.file.path, '→', outPath);

          await sharp(req.file.path)
            .resize(1200, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(outPath);

          fs.unlinkSync(req.file.path);
          console.log('✅ Image processed successfully');
        } catch (imgError) {
          console.error('❌ Image processing error:', imgError);
          // Continue without image
        }
      }

      // Try inserting with user_id first
      let reportData = {
        user_id: req.user.userId,
        location,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        image: imageName,
        status: 'pending'
      };

      console.log('📤 Inserting report to database:', reportData);

      // Use admin client to bypass RLS for inserts
      let { data, error } = await supabaseAdmin
        .from('eco_reports')
        .insert([reportData])
        .select();

      // If user_id column doesn't exist, try without it (temporary workaround)
      if (error && error.message && error.message.includes('user_id')) {
        console.warn('⚠️ user_id column not found, inserting without it (temporary)');
        reportData = {
          location,
          description,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          image: imageName,
          status: 'pending'
        };

        const retryResult = await supabaseAdmin
          .from('eco_reports')
          .insert([reportData])
          .select();

        data = retryResult.data;
        error = retryResult.error;

        if (!error) {
          console.warn('⚠️ Report saved WITHOUT user_id. Please run fix_eco_reports_schema.sql to add the column.');
        }
      }

      if (error) {
        console.error('❌ Database insert error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // If user_id column is missing, provide helpful SQL fix
        if (error.message && error.message.includes('user_id')) {
          console.error('\n🔧 SQL FIX REQUIRED:');
          console.error('The user_id column is missing from eco_reports table.');
          console.error('See fix_eco_reports_schema.sql file for the SQL to run.');
          return res.status(500).json({
            error: 'Database schema issue: user_id column missing',
            message: error.message,
            hint: 'Run fix_eco_reports_schema.sql in Supabase SQL Editor to add the missing column'
          });
        }

        // If RLS policy violation, provide helpful fix
        if (error.code === '42501' || (error.message && error.message.includes('row-level security'))) {
          console.error('\n🔒 RLS POLICY ISSUE:');
          console.error('Row Level Security is blocking the insert.');
          console.error('Solutions:');
          console.error('1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file (recommended)');
          console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
          console.error('2. Or update RLS policies - see fix_rls_policies.sql');
          return res.status(500).json({
            error: 'Row Level Security policy violation',
            message: error.message,
            hint: 'Add SUPABASE_SERVICE_ROLE_KEY to .env file, or update RLS policies. See server console for details.'
          });
        }

        return res.status(500).json({
          error: error.message,
          details: error.details,
          hint: error.hint
        });
      }

      console.log('✅ Report inserted successfully:', data);
      res.json({ success: true, data });
    } catch (err) {
      console.error('❌ Exception in report submission:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    }
  }
);

// Debug endpoint to check reports (including deleted)
app.get('/api/debug/reports', async (req, res) => {
  try {
    const { data: allReports } = await supabase
      .from('eco_reports')
      .select('id, location, deleted_at, created_at')
      .order('created_at', { ascending: false });

    const deleted = allReports?.filter(r => r.deleted_at) || [];
    const active = allReports?.filter(r => !r.deleted_at) || [];

    res.json({
      total: allReports?.length || 0,
      active: active.length,
      deleted: deleted.length,
      reports: allReports || []
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    console.log('📋 Fetching reports from database...');

    // First, check total count (including deleted) for debugging
    const { count: totalCount } = await supabase
      .from('eco_reports')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total reports in database (including deleted): ${totalCount || 0}`);

    // Try without join first (more reliable)
    const { data, error } = await supabase
      .from('eco_reports')
      .select('*')
      .is('deleted_at', null) // Filter out soft-deleted reports
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching reports:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return res.json([]);
    }

    // Handle null response from Supabase
    if (data === null || data === undefined) {
      console.warn('⚠️ Supabase returned null/undefined, trying query without deleted_at filter...');
      // Try without deleted_at filter to see if that's the issue
      const { data: altData, error: altError } = await supabase
        .from('eco_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (altError) {
        console.error('❌ Alternative query also failed:', altError);
        return res.json([]);
      }

      const reports = Array.isArray(altData) ? altData : [];
      console.log(`✅ Returning ${reports.length} reports (without deleted_at filter)`);
      if (reports.length > 0 && reports[0].deleted_at) {
        console.warn('⚠️ Reports exist but are soft-deleted. Check deleted_at column.');
      }
      return res.json(reports);
    }

    // Ensure we always return an array
    const reports = Array.isArray(data) ? data : [];
    console.log(`✅ Returning ${reports.length} reports (non-deleted)`);

    if (reports.length === 0 && totalCount > 0) {
      console.warn(`⚠️ Found ${totalCount} total reports but all are soft-deleted (deleted_at is set)`);
      console.log('💡 Tip: Reports might be soft-deleted. Check the database or use admin panel to restore them.');
    }

    if (reports.length > 0) {
      console.log('📄 Sample report structure:', {
        id: reports[0].id,
        location: reports[0].location,
        hasImage: !!reports[0].image,
        hasDescription: !!reports[0].description,
        deleted_at: reports[0].deleted_at
      });
    }

    res.json(reports);
  } catch (err) {
    console.error('❌ Exception fetching reports:', err);
    res.json([]);
  }
});

/* ===============================
   MAP HOTSPOTS (IMPORTANT)
================================ */
// Hotspots route moved below to avoid duplication

/* ===============================
   MISSION JOIN
================================ */
app.post('/api/join', async (req, res) => {
  try {
    const { mission_id, name, email, phone } = req.body;

    // Validate required fields
    if (!mission_id) {
      return res.status(400).json({ error: 'Mission ID is required' });
    }
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // mission_id can be UUID or integer - Supabase handles both
    const missionId = mission_id.toString().trim();

    // Verify mission exists
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      console.error('Mission lookup error:', missionError);
      return res.status(400).json({ error: 'Mission not found' });
    }

    // Insert registration
    const { data, error } = await supabase
      .from('mission_registrations')
      .insert([{
        mission_id: missionId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null
      }])
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      // Check for duplicate entry
      if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
        return res.status(400).json({ error: 'You have already registered for this mission' });
      }
      // Check for foreign key constraint
      if (error.code === '23503' || error.message.includes('foreign key')) {
        return res.status(400).json({ error: 'Invalid mission ID' });
      }
      return res.status(400).json({ error: error.message || 'Failed to register for mission' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Join mission error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

/* ===============================
   ADMIN ROUTES
================================ */
app.get('/api/admin/reports', authenticateToken, isAdmin, async (req, res) => {
  const includeDeleted = req.query.include_deleted === 'true';

  let query = supabaseAdmin
    .from('eco_reports')
    .select('*, users!user_id(name, email)')
    .order('created_at', { ascending: false });

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching admin reports:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

app.put('/api/admin/reports/:id', authenticateToken, isAdmin, async (req, res) => {
  const { status, severity, deleted_at, featured } = req.body;

  const updateData = {
    reviewed_by: req.user.userId,
    reviewed_at: new Date().toISOString()
  };

  if (status !== undefined) updateData.status = status;
  if (severity !== undefined) updateData.severity = severity;
  if (deleted_at !== undefined) updateData.deleted_at = deleted_at;
  if (featured !== undefined) updateData.featured = featured;

  const { error } = await supabaseAdmin
    .from('eco_reports')
    .update(updateData)
    .eq('id', req.params.id);

  if (error) {
    console.error('Error updating report:', error);
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true });
});

// Single hotspots endpoint (consolidated)
app.get('/api/hotspots', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('eco_reports')
      .select(`
        id,
        location,
        latitude,
        longitude,
        status,
        created_at
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Convert to map-friendly format
    const hotspots = data.map(r => ({
      id: r.id,
      location: r.location,
      lat: r.latitude,
      lng: r.longitude,
      status: r.status || 'pending',
      time: r.created_at
    }));

    res.json(hotspots);

  } catch (err) {
    console.error('Hotspot error:', err);
    res.status(500).json({ error: 'Failed to load hotspots' });
  }
});


/* ===============================
   POLICY TRACKER (REAL-TIME AGGREGATION)
   Computes policy progress and status from live reports
================================= */
app.get('/api/policies', async (req, res) => {
  try {
    // 1) Try to fetch policies table (if exists)
    let { data: policiesData, error: polError } = await supabase
      .from('policies')
      .select('*');

    if (polError) {
      console.warn('Policies table not available or query failed:', polError.message || polError);
      policiesData = null;
    }

    // 2) Fetch non-deleted reports (we'll aggregate in-memory)
    const { data: reports, error: reportsError } = await supabase
      .from('eco_reports')
      .select('id, policy_id, category, status, created_at, impact_metric')
      .is('deleted_at', null);

    if (reportsError) {
      console.error('Error fetching reports for policies:', reportsError.message || reportsError);
      return res.status(500).json({ error: 'Failed to load reports' });
    }

    // 3) Build base policies list. If no policies table, derive from distinct categories
    let policies = [];
    if (Array.isArray(policiesData) && policiesData.length > 0) {
      policies = policiesData.map(p => ({ ...p }));
    } else {
      // derive unique categories from reports
      const cats = Array.from(new Set((reports || []).map(r => r.category).filter(Boolean)));
      policies = cats.map((c, i) => ({ id: `cat-${i}`, title: c, category: c, description: null, responsible_agency: null, timeline_phase: null }));
    }

    // 4) Map policies by string key for robust matching
    const policyMap = new Map();
    policies.forEach(p => policyMap.set(String(p.id), { ...p, total: 0, verified: 0, resolved: 0, last_updated: null, impact: 0 }));

    // 5) Aggregate reports into policy buckets
    (reports || []).forEach(r => {
      // choose match: explicit policy_id first, then category
      let key = r.policy_id !== null && r.policy_id !== undefined ? String(r.policy_id) : null;

      if (!key && r.category) {
        // try to find a policy with same category
        const found = policies.find(p => p.category && String(p.category) === String(r.category));
        if (found) key = String(found.id);
      }

      // if still no key, skip (uncategorized)
      if (!key) return;

      if (!policyMap.has(key)) {
        // create lightweight placeholder policy when reports reference unknown policy id
        policyMap.set(key, { id: key, title: r.category || `Policy ${key}`, category: r.category || null, description: null, responsible_agency: null, timeline_phase: null, total: 0, verified: 0, resolved: 0, last_updated: null, impact: 0 });
      }

      const bucket = policyMap.get(key);
      bucket.total = (bucket.total || 0) + 1;
      const st = (r.status || '').toLowerCase();
      if (st === 'verified') bucket.verified = (bucket.verified || 0) + 1;
      if (st === 'resolved' || st === 'approved') bucket.resolved = (bucket.resolved || 0) + 1;
      if (r.impact_metric) bucket.impact = (bucket.impact || 0) + Number(r.impact_metric || 0);
      if (r.created_at) {
        const t = new Date(r.created_at);
        if (!bucket.last_updated || t > new Date(bucket.last_updated)) bucket.last_updated = r.created_at;
      }
      policyMap.set(key, bucket);
    });

    // 6) Compute progress, status, and prepare result array
    const result = Array.from(policyMap.values()).map(p => {
      const total = p.total || 0;
      const resolved = p.resolved || 0;
      const verified = p.verified || 0;
      const progress = total ? Math.round((resolved / total) * 100) : 0;

      let status = 'Planning';
      if (total === 0) status = 'Planning';
      else if (progress >= 80) status = 'Implemented';
      else if (verified > 0 && resolved > 0) status = 'In Progress';
      else status = 'Pending';

      return {
        id: p.id,
        title: p.title || p.category || `Policy ${p.id}`,
        category: p.category || null,
        description: p.description || null,
        responsible_agency: p.responsible_agency || null,
        timeline_phase: p.timeline_phase || null,
        total_related_reports: total,
        verified_reports: verified,
        resolved_reports: resolved,
        progress,
        status,
        impact: p.impact || 0,
        last_updated: p.last_updated || p.updated_at || null
      };
    });

    // 7) Summary counts
    const summary = {
      implemented: result.filter(r => r.status === 'Implemented').length,
      in_progress: result.filter(r => r.status === 'In Progress').length,
      pending: result.filter(r => r.status === 'Pending').length,
      planning: result.filter(r => r.status === 'Planning').length,
      total: result.length
    };

    res.json({ policies: result, summary });
  } catch (err) {
    console.error('Policy tracker error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Soft delete report
app.put('/api/admin/reports/:id/soft-delete', authenticateToken, isAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('eco_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Restore soft deleted report
app.put('/api/admin/reports/:id/restore', authenticateToken, isAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('eco_reports')
    .update({ deleted_at: null })
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Permanent delete report
app.delete('/api/admin/reports/:id', authenticateToken, isAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.from('eco_reports').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// READ
app.get('/api/missions', async (req, res) => {
  const { data: missions, error } = await supabase
    .from('missions')
    .select('*')
    .order('date', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  // Get participant counts for each mission
  const missionsWithCounts = await Promise.all(
    (missions || []).map(async (mission) => {
      const { count } = await supabase
        .from('mission_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('mission_id', mission.id);

      return {
        ...mission,
        participant_count: count || 0
      };
    })
  );

  res.json(missionsWithCounts);
});

// UPDATE
app.put('/api/admin/missions/:id', authenticateToken, isAdmin, async (req, res) => {
  await supabase.from('missions').update(req.body).eq('id', req.params.id);
  res.json({ success: true });
});

// DELETE
app.delete('/api/admin/missions/:id', authenticateToken, isAdmin, async (req, res) => {
  const missionId = req.params.id;

  // Manual cascade delete: delete registrations first
  const { error: regError } = await supabase
    .from('mission_registrations')
    .delete()
    .eq('mission_id', missionId);

  if (regError) {
    console.error('Error deleting mission registrations:', regError);
    // Continue anyway to try deleting the mission, or return error?
    // Usually safe to proceed if the error is "no rows" (which wouldn't be an error),
    // but if it's a DB error, we might fail on the next step.
    // We'll proceed but log it.
  }

  const { error } = await supabase.from('missions').delete().eq('id', missionId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Get mission participants
app.get('/api/admin/missions/:id/participants', authenticateToken, isAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('mission_registrations')
    .select('id, name, email, phone, registered_at')
    .eq('mission_id', req.params.id)
    .order('registered_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  // Map registered_at to created_at for frontend compatibility
  const participants = (data || []).map(p => ({
    ...p,
    created_at: p.registered_at
  }));

  res.json(participants);
});

// Delete mission participant
app.delete('/api/admin/missions/participants/:id', authenticateToken, isAdmin, async (req, res) => {
  const { error } = await supabase
    .from('mission_registrations')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, password, role, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.post(
  '/api/admin/missions',
  authenticateToken,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { title, description, date, location } = req.body;

      // Validate required fields
      if (!title || !description || !date || !location) {
        return res.status(400).json({
          error: 'Missing required fields: title, description, date, and location are required'
        });
      }

      let imageName = null;

      if (req.file) {
        imageName = `mission-${Date.now()}.jpg`;

        await sharp(req.file.path)
          .resize(1200, 800)
          .jpeg({ quality: 80 })
          .toFile(path.join(__dirname, 'uploads', imageName));

        fs.unlinkSync(req.file.path);
      }

      const { data, error } = await supabase.from('missions').insert([{
        title,
        description,
        date,
        location,
        image: imageName
      }]).select().single();

      if (error) {
        console.error('Database error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Mission creation error:', err);
      res.status(500).json({ error: 'Failed to create mission: ' + err.message });
    }
  }
);


// CREATE
app.post('/api/admin/eco-guide', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, location, category } = req.body;
  const { error } = await supabase.from('eco_guides')
    .insert([{ name, description, location, category }]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// READ (Public)
app.get('/api/eco-guide', async (req, res) => {
  const { data } = await supabase.from('eco_guides').select('*');
  res.json(data);
});

// UPDATE
app.put('/api/admin/eco-guide/:id', authenticateToken, isAdmin, async (req, res) => {
  await supabase.from('eco_guides').update(req.body).eq('id', req.params.id);
  res.json({ success: true });
});

// DELETE
app.delete('/api/admin/eco-guide/:id', authenticateToken, isAdmin, async (req, res) => {
  await supabase.from('eco_guides').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.post(
  '/api/admin/eco-guide',
  authenticateToken,
  isAdmin,
  upload.single('image'),
  async (req, res) => {

    const { title, description, category } = req.body;

    let imageName = null;

    if (req.file) {
      imageName = `eco-${Date.now()}.jpg`;

      await sharp(req.file.path)
        .resize(1200, 800)
        .jpeg({ quality: 80 })
        .toFile(`uploads/${imageName}`);

      fs.unlinkSync(req.file.path);
    }

    const { error } = await supabase.from('eco_guide').insert([{
      title,
      description,
      category,
      image: imageName
    }]);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true });
  }
);

/* ===============================
   ECO SPOTS ROUTES
================================ */
// Create eco spot
app.post(
  '/api/admin/eco-spots',
  authenticateToken,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    const { name, rating, location, description, category, price, features, details } = req.body;

    let imageName = null;
    if (req.file) {
      imageName = `ecospot-${Date.now()}.jpg`;
      await sharp(req.file.path)
        .resize(1200, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(`uploads/${imageName}`);
      fs.unlinkSync(req.file.path);
    }

    const { data, error } = await supabase.from('eco_spots').insert([{
      name,
      rating: parseFloat(rating),
      location,
      description,
      category,
      price: price || null,
      features: features || null,
      details: details || null,
      image: imageName
    }]).select().single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  }
);

// Get all eco spots (public)
app.get('/api/eco-spots', async (req, res) => {
  const { data, error } = await supabase
    .from('eco_spots')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

// Get single eco spot
app.get('/api/eco-spots/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('eco_spots')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update eco spot
app.put(
  '/api/admin/eco-spots/:id',
  authenticateToken,
  isAdmin,
  upload.single('image'),
  async (req, res) => {
    const { name, rating, location, description, category, price, features, details } = req.body;

    const updateData = {
      name,
      rating: rating ? parseFloat(rating) : undefined,
      location,
      description,
      category,
      price: price || null,
      features: features || null,
      details: details || null
    };

    if (req.file) {
      const imageName = `ecospot-${Date.now()}.jpg`;
      await sharp(req.file.path)
        .resize(1200, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(`uploads/${imageName}`);
      fs.unlinkSync(req.file.path);
      updateData.image = imageName;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key =>
      updateData[key] === undefined && delete updateData[key]
    );

    const { data, error } = await supabase
      .from('eco_spots')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  }
);

// Delete eco spot
app.delete('/api/admin/eco-spots/:id', authenticateToken, isAdmin, async (req, res) => {
  const { error } = await supabase.from('eco_spots').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Hotspots endpoint already defined above


/* ===============================
   ADDITIONAL API ENDPOINTS
================================ */
// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Get reports count per user
    const { data: reports } = await supabase
      .from('eco_reports')
      .select('user_id, users(name)')
      .not('user_id', 'is', null);

    // Get missions joined count per user
    const { data: missions } = await supabase
      .from('mission_registrations')
      .select('email');

    // Calculate scores (simplified)
    const userScores = {};
    reports?.forEach(r => {
      const userId = r.user_id;
      if (!userScores[userId]) {
        userScores[userId] = { name: r.users?.name || 'Anonymous', score: 0 };
      }
      userScores[userId].score += 10; // 10 points per report
    });

    const leaderboard = Object.values(userScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      top3: leaderboard.slice(0, 3),
      list: leaderboard.slice(3),
      totalReports: reports?.length || 0,
      totalMissions: missions?.length || 0,
      totalTrees: Math.floor((reports?.length || 0) * 0.5) // Estimate
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.json({ top3: [], list: [], totalReports: 0, totalMissions: 0, totalTrees: 0 });
  }
});

// Report Statistics (for policy tracker)
app.get('/api/report-stats', async (req, res) => {
  try {
    const { data: reports } = await supabase
      .from('eco_reports')
      .select('status')
      .is('deleted_at', null);

    const stats = {
      total: reports?.length || 0,
      pending: reports?.filter(r => r.status === 'pending' || !r.status).length || 0,
      approved: reports?.filter(r => r.status === 'approved').length || 0,
      rejected: reports?.filter(r => r.status === 'rejected').length || 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Report stats error:', err);
    res.json({ total: 0, pending: 0, approved: 0, rejected: 0 });
  }
});

// Policies
app.get('/api/policies', async (req, res) => {
  try {
    const { data } = await supabase
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false });

    res.json(data || []);
  } catch (err) {
    console.error('Policies error:', err);
    res.json([]);
  }
});

// Experiences (Eco Guide)
app.get('/api/experiences', async (req, res) => {
  try {
    const { data } = await supabase
      .from('eco_guides')
      .select('*')
      .order('created_at', { ascending: false });

    res.json(data || []);
  } catch (err) {
    console.error('Experiences error:', err);
    res.json([]);
  }
});

/* ===============================
   START SERVER
================================ */
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port = DEFAULT_PORT, attempts = 8) {
  const server = app.listen(port, () => {
    console.log(`🚀 Goa Eco-Guard backend running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempts > 0) {
      console.warn(`Port ${port} in use — trying ${port + 1} (attempts left: ${attempts - 1})`);
      setTimeout(() => startServer(port + 1, attempts - 1), 200);
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });
}

// Allow skipping the HTTP listener when the service should not bind to a port
// (useful when only deploying frontend to Netlify and using a remote backend).
const SKIP_LISTEN = process.env.SKIP_LISTEN === 'true' || process.env.NO_LISTEN === '1';
if (SKIP_LISTEN) {
  console.log('SKIP_LISTEN enabled — HTTP server will not start.');
  module.exports = app; // export app for tests or external runners
} else {
  startServer();
}

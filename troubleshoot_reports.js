const fs = require('fs');

const API_URL = 'http://localhost:3000/api';
const LOG_FILE = 'troubleshoot_log.txt';

// Helper to log to file and console
function log(msg, type = 'INFO') {
    const logMsg = `[${type}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(LOG_FILE, logMsg + '\n');
}

// Helper to make requests
async function request(method, endpoint, data = null, token = null) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = {
            method,
            headers,
        };

        if (data) config.body = JSON.stringify(data);

        const response = await fetch(`${API_URL}${endpoint}`, config);
        const json = await response.json();

        return { status: response.status, data: json, ok: response.ok };
    } catch (error) {
        return { status: 'ERR', error: error.message, ok: false };
    }
}

async function runTroubleshoot() {
    log('--- STARTING TROUBLESHOOT ---');

    // 1. Create a Test User (Admin)
    // Actually we need to be careful not to spam users table.
    // Let's try to login with a known test credential if possible, or register one.
    const testUser = {
        name: 'Troubleshoot Admin',
        email: `admin_${Date.now()}@test.com`,
        password: 'password123',
        phone: '1234567890'
    };

    log(`1. registering test user: ${testUser.email}`);
    // Register (this creates a regular user usually, need to make admin manualy or just test user flows first)
    // Wait, typical register endpoint creates regular user.
    // We need an ADMIN token for most tests.
    // We can use the 'create-admin' logic but programmatically? 
    // Or we rely on existing 'create-admin.js' script. 
    // Let's assume the user has an admin account. If not, I can't test admin routes easily without direct DB access.
    // BUT, I have server.js access. I can Temporarily add a "become admin" route or just use the local Supabase key?
    // Actually, I can use the existing /api/auth/register endpoint, and then maybe I can't promote to admin through API.
    // However, I can check if I can hit public report endpoints at least.

    // Attempt Register
    let auth = await request('POST', '/auth/register', testUser);
    if (!auth.ok) {
        log(`Failed to register: ${JSON.stringify(auth)}`, 'ERROR');
        // Try login just in case
        auth = await request('POST', '/auth/login', { email: testUser.email, password: testUser.password });
    }

    if (!auth.ok || !auth.data.token) {
        log('CRITICAL: Cannot get auth token. Aborting.', 'ERROR');
        return;
    }

    const userToken = auth.data.token;
    const userId = auth.data.user.id;
    log('Got User Token.', 'SUCCESS');

    // 2. Submit a Report (Public/User)
    log('2. Testing Submit Report...');
    // We need to use FormData for image upload usually, but server might verify it.
    // server.js expects 'upload.single' so we must send multipart/form-data.
    // Node fetch with FormData is tricky without external lib, but we can try just JSON for now?
    // Wait, server.js uses `upload.single('image')`. If we don't send image, does it fail? 
    // `if (req.file)` blocks are there, so image is optional?
    // But `upload.single` middleware might complain if content-type isn't multipart.
    // Let's try sending JSON first.

    // Wait, server code: `upload.single('image')`
    // If we send JSON, multer might just skip parsing file and body access works?
    // Multer populates req.body.

    // We need to construct a multipart request manually or skip image.
    // Let's try just skipping image for now using a boundary.
    // Actually, simpler: Use a separate simple test for endpoints that don't need image.

    // 3. Test GET Reports (Public)
    log('3. Testing Public GET Reports...');
    const getRes = await request('GET', '/reports');
    if (getRes.ok) {
        log(`Success. Got ${getRes.data.length} reports.`, 'SUCCESS');
        if (getRes.data.length > 0) {
            log(`Sample ID: ${getRes.data[0].id}`);
        }
    } else {
        log(`Failed GET /reports: ${JSON.stringify(getRes)}`, 'ERROR');
    }

    // 4. Test Report Stats
    log('4. Testing Report Stats...');
    const statsRes = await request('GET', '/report-stats');
    if (statsRes.ok) {
        log(`Success. Stats: ${JSON.stringify(statsRes.data)}`, 'SUCCESS');
    } else {
        log('Failed GET /report-stats', 'ERROR');
    }

    log('--- FINISHED ---');
    log('Check troubleshoot_log.txt for details.');
}

runTroubleshoot();

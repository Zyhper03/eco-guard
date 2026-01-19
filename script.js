// ===============================
// Goa Eco-Guard - Final Script
// ===============================

// Production API endpoint (Render)
const API_BASE = 'https://eco-guard-backend.onrender.com';

/* ===============================
   AUTH MANAGER
================================ */
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('ecoToken');
        this.user = JSON.parse(localStorage.getItem('ecoUser')) || null;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    isAdmin() {
        return this.user?.role === 'admin';
    }

    getAuthHeader() {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {};
    }

    async login(email, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        this.token = data.token;
        this.user = data.user;

        localStorage.setItem('ecoToken', data.token);
        localStorage.setItem('ecoUser', JSON.stringify(data.user));

        return data;
    }

    async register(payload) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        this.token = data.token;
        this.user = data.user;

        localStorage.setItem('ecoToken', data.token);
        localStorage.setItem('ecoUser', JSON.stringify(data.user));

        return data;
    }

    logout() {
        localStorage.clear();
        window.location.reload();
    }
}

/* ===============================
   MAIN APPLICATION
================================ */
class GoaEcoGuard {
    constructor() {
        this.auth = new AuthManager();
        this.map = null;
        this.markerLayers = {};
        this.allHotspots = [];
        this.hotspotsGrouped = {};
        this.markersByLocation = {};
        this.init();
    }

    async testBackendConnection() {
        try {
            console.log('Testing backend connection to:', API_BASE);

            const response = await fetch(`${API_BASE}/api/health`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend is reachable:', data);
                return true;
            } else {
                console.error('❌ Backend responded with error:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Cannot connect to backend:', error.message);
            console.log('Troubleshooting steps:');
            console.log('1. Make sure backend is running: node server.js');
            console.log('2. Check if port 3000 is available');
            console.log('3. Try accessing:', `${API_BASE}/api/health` + ' in your browser');
            return false;
        }
    }



    getMarkerIcon(status) {
        const colors = {
            pending: '#f97316',   // orange
            approved: '#2563eb',  // blue
            resolved: '#16a34a',  // green
            rejected: '#dc2626'   // red
        };

        return L.divIcon({
            className: '',
            html: `
                <div style="
                    width:18px;
                    height:18px;
                    background:${colors[status] || '#6b7280'};
                    border-radius:50%;
                    border:3px solid white;
                    box-shadow:0 0 6px rgba(0,0,0,0.4);
                "></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
    }


    /* ---------- INIT ---------- */
    init() {
        this.initEventListeners();
        this.checkAuthState();
        this.loadAllData();
        this.testBackendConnection();
        this.initIntersectionObserver();
        this.initNavbarScroll();
        this.initViewOnMapButtons();
        this.showToast('Welcome to Goa Eco-Guard!', 'success');
    }

    /* ---------- NAVBAR SCROLL ---------- */
    initNavbarScroll() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = 0;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Add/remove scrolled class based on scroll position
            if (currentScrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Hide/show navbar based on scroll direction DISABLE FOR STICKY
            // if (currentScrollY > lastScrollY && currentScrollY > 200) {
            //    header.classList.add('hidden');
            // } else {
            //    header.classList.remove('hidden');
            // }

            lastScrollY = currentScrollY;
        });
    }

    /* ---------- AUTH UI ---------- */
    checkAuthState() {
        this.auth.isAuthenticated()
            ? this.updateUIForUser()
            : this.updateUIForGuest();
    }

    updateUIForUser() {
        document.querySelector('.auth-buttons')?.remove();

        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-dropdown">
                <button class="user-btn">${this.auth.user.name.split(' ')[0]}</button>
                <div class="dropdown-content">
                    <a href="#" id="logoutBtn">Logout</a>
                </div>
            </div>
        `;
        document.querySelector('.header-content')?.appendChild(menu);
    }

    updateUIForGuest() {
        if (document.querySelector('.auth-buttons')) return;

        const cta = document.querySelector('.header-cta');
        cta.innerHTML = `
            <div class="auth-buttons">
                <button class="btn btn-outline btn-sm" id="loginBtn">Login</button>
                <button class="btn btn-primary btn-sm" id="signupBtn">Sign Up</button>
            </div>
        `;
    }

    /* ---------- EVENTS ---------- */
    initEventListeners() {
        // Navigation buttons - scroll to sections
        document.addEventListener('click', (e) => {
            const section = e.target.closest('[data-section]');
            if (section) {
                const sectionId = section.getAttribute('data-section');
                this.scrollToSection(sectionId);
                // Close mobile menu if open
                document.getElementById('mobileNav')?.classList.remove('active');
                document.getElementById('mobileMenuBtn')?.classList.remove('active');
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                e.target.closest('.nav-link')?.classList.add('active');
                return;
            }

            if (e.target.id === 'loginBtn') {
                window.location.href = 'login/login.html';
                return;
            }
            if (e.target.id === 'signupBtn') {
                window.location.href = 'login/signup.html';
                return;
            }
            if (e.target.id === 'logoutBtn') this.auth.logout();

            // Mobile menu toggle
            if (e.target.id === 'mobileMenuBtn' || e.target.closest('#mobileMenuBtn')) {
                const mobileNav = document.getElementById('mobileNav');
                const menuBtn = document.getElementById('mobileMenuBtn');
                mobileNav?.classList.toggle('active');
                menuBtn?.classList.toggle('active');
                return;
            }

            // Mission modal handlers
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('close') || e.target.id === 'closeJoin') {
                document.querySelectorAll('.modal').forEach(m => {
                    m.classList.remove('active');
                    m.classList.add('hidden');
                });
                return;
            }

            // Join mission button
            if (e.target.classList.contains('join-mission-btn')) {
                const missionId = e.target.dataset.missionId;
                this.openMissionModal(missionId);
                return;
            }

            // Confirm join mission
            if (e.target.id === 'confirmJoinBtn') {
                const missionId = e.target.dataset.missionId;
                this.showJoinForm(missionId);
                return;
            }

            // Submit join form
            if (e.target.closest('#joinForm')) {
                e.preventDefault();
                this.handleJoinMission(e);
                return;
            }

            // Know more button for eco spots
            if (e.target.classList.contains('know-more-btn') || e.target.closest('.know-more-btn')) {
                const btn = e.target.closest('.know-more-btn') || e.target;
                const spotId = btn.dataset.spotId;
                if (spotId) {
                    this.openEcoSpotModal(parseInt(spotId));
                }
                return;
            }

            // Heatmap filter buttons
            if (e.target.classList.contains('filter-btn')) {
                const filterBtn = e.target;
                const filter = filterBtn.dataset.filter;
                
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                filterBtn.classList.add('active');
                
                console.log('🔍 Filter applied:', filter);
                
                // Re-render map and cards with new filter
                this.renderMarkers();
                this.renderHotspotCards();
                
                // Fit map bounds to filtered markers
                if (this.map && this.hotspotsGrouped) {
                    setTimeout(() => {
                        const filteredHotspots = Object.values(this.hotspotsGrouped).filter(h =>
                            filter === 'all' || h.severity === filter
                        );
                        
                        if (filteredHotspots.length > 0) {
                            const bounds = L.latLngBounds();
                            filteredHotspots.forEach(h => {
                                bounds.extend([h.lat, h.lng]);
                            });
                            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                        }
                    }, 100);
                }
                return;
            }
        });

        // Login and signup forms are now on separate pages
        document.getElementById('loginForm')?.addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', e => this.handleSignup(e));
        document.getElementById('reportingForm')?.addEventListener('submit', e => this.submitReport(e));

        // 📍 Get current location
        const getLocationBtn = document.getElementById('getLocationBtn');
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    this.showToast('Geolocation not supported', 'error');
                    return;
                }

                this.showToast('Fetching location...', 'success');

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        document.getElementById('latitude').value = pos.coords.latitude;
                        document.getElementById('longitude').value = pos.coords.longitude;

                        document.getElementById('locationStatus').style.display = 'block';
                        this.showToast('Location captured ✔', 'success');
                    },
                    () => {
                        this.showToast('Location permission denied', 'error');
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        }
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }


    /* ---------- AUTH HANDLERS ---------- */
    async handleLogin(e) {
        e.preventDefault();

        const email = loginEmail.value;
        const password = loginPassword.value;

        try {
            const result = await this.auth.login(email, password);

            // 🔐 Admin redirect
            if (result.user.role === 'admin') {
                window.location.href = 'admin/admin.html';
                return;
            }

            this.closeModal();
            this.checkAuthState();
            this.loadAllData();
            this.showToast('Login successful!', 'success');

        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();

        if (signupPassword.value !== confirmPassword.value) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            await this.auth.register({
                name: signupName.value,
                email: signupEmail.value,
                phone: signupPhone.value,
                password: signupPassword.value
            });

            this.closeModal();
            this.checkAuthState();
            this.showToast('Account created!', 'success');

        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    /* ---------- DATA LOADING ---------- */
    loadAllData() {
        this.loadReports();
        this.loadHotspots();
        this.loadMissions();
        // Leaderboard temporarily disabled
        // this.loadLeaderboard();
        this.loadPolicies();
        this.loadExperiences();
        this.loadEcoSpots();
    }

    async fetchJSON(endpoint, auth = false) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: auth ? this.auth.getAuthHeader() : {}
            });
            if (!res.ok) {
                console.warn(`API ${endpoint} returned status ${res.status}`);
                return [];
            }
            const data = await res.json();
            console.log(`API ${endpoint} response:`, data);
            // Ensure we always return an array for list endpoints
            if (data === null || data === undefined) {
                console.warn(`API ${endpoint} returned null/undefined`);
                return [];
            }
            return Array.isArray(data) ? data : (data || []);
        } catch (err) {
            console.error(`Error fetching ${endpoint}:`, err);
            return [];
        }
    }

    /* ---------- REPORTS ---------- */
    async loadReports() {
        try {
            this.reports = await this.fetchJSON('/api/reports');
            console.log('Loaded reports:', this.reports);
            // Ensure reports is always an array
            if (!Array.isArray(this.reports)) {
                console.warn('Reports is not an array:', typeof this.reports, this.reports);
                this.reports = [];
            }
            this.renderReports();
        } catch (err) {
            console.error('Error loading reports:', err);
            this.reports = [];
            this.renderReports();
        }
    }

    async submitReport(e) {
        e.preventDefault();
        if (!this.auth.isAuthenticated()) {
            window.location.href = 'login/login.html';
            return;
        }

        const formData = new FormData(e.target);

        const lat = formData.get('latitude');
        const lng = formData.get('longitude');

        if (!lat || !lng) {
            this.showToast('Please use current location before submitting', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/report`, {
                method: 'POST',
                headers: this.auth.getAuthHeader(),
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit report');
            }

            this.showToast('Report submitted successfully!', 'success');
            e.target.reset();
            document.getElementById('locationStatus').style.display = 'none';
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('uploadArea').style.display = 'flex';

            // ✅ UPDATE BOTH
            this.loadReports();
            this.loadHotspots(); // 🔥 THIS MAKES MAP LIVE
        } catch (err) {
            this.showToast(err.message || 'Failed to submit report', 'error');
        }
    }

    renderReports() {
        const container = document.getElementById('reportsList');
        if (!container) {
            console.warn('⚠️ reportsList container not found');
            return;
        }

        // Ensure reports is an array before accessing length
        if (!this.reports || !Array.isArray(this.reports)) {
            console.warn('⚠️ Reports is not an array:', typeof this.reports, this.reports);
            this.reports = [];
        }

        console.log(`🎨 Rendering ${this.reports.length} reports`);

        if (this.reports.length > 0) {
            console.log('📋 First report:', this.reports[0]);
        }

        // helper to format created_at safely
        const formatReportTime = (ts) => {
            if (!ts) return 'Unknown time';
            const d = new Date(ts);
            if (isNaN(d)) return ts;
            return d.toLocaleString();
        };

        const escapeHtml = (s = '') => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        container.innerHTML = this.reports.length
            ? this.reports.map(r => {
                const status = (r.status || 'pending').toLowerCase();
                const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                const statusClass = `status-${status}`;
                const timeStr = formatReportTime(r.created_at || r.createdAt || r.timestamp);

                return `
                <div class="report-card ${statusClass}">
                    <div class="report-header">
                        ${r.image ? `<img src="${API_BASE}/uploads/${encodeURIComponent(r.image)}" alt="${escapeHtml(r.location || 'Report')}" class="report-image">` : `<div class="report-image-placeholder">📷</div>`}
                        <div class="report-info">
                            <div class="report-location">${escapeHtml(r.location || 'Location not specified')}</div>
                            <div class="report-description">${escapeHtml(r.description || 'No description')}</div>
                            <div class="report-meta">
                                <div class="report-time">${escapeHtml(timeStr)}</div>
                                <div class="report-status ${escapeHtml(status)}">${escapeHtml(statusLabel)}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')
            : `<p class="text-center">No reports yet.</p>`;
    }



    /* ---------- HEATMAP ---------- */
    async loadHotspots() {
        try {
            // Show loading state
            const loadingEl = document.querySelector('.map-loading');
            if (loadingEl) loadingEl.classList.remove('hidden');

            // Fetch real reports data from backend
            const reports = await this.fetchJSON('/api/reports');
            console.log('📍 Reports fetched:', reports.length);

            // Convert reports to hotspots format with severity mapping
            this.allHotspots = (reports || []).map(r => ({
                id: r.id,
                location: r.location || 'Unknown Location',
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude),
                description: r.description,
                severity: this.getReportSeverity(r.severity),
                status: r.status || 'pending',
                created_at: r.created_at,
                image: r.image
            })).filter(h => !isNaN(h.lat) && !isNaN(h.lng));

            // Group by location to get report counts
            this.hotspotsGrouped = this.groupHotspotsByLocation(this.allHotspots);
            
            console.log('🗺️ Hotspots ready:', this.allHotspots.length, 'reports,', Object.keys(this.hotspotsGrouped).length, 'unique locations');

            // Initialize map with real data
            this.initMap();
            
            // Render hotspot cards
            this.renderHotspotCards();

            // Hide loading state
            if (loadingEl) loadingEl.classList.add('hidden');
        } catch (err) {
            console.error('Error loading hotspots:', err);
            const loadingEl = document.querySelector('.map-loading');
            if (loadingEl) loadingEl.classList.add('hidden');
            this.initMap();
        }

        // Auto-refresh every 60 seconds
        setInterval(() => {
            if (this.map) {
                this.refreshMap();
            }
        }, 60000);
    }

    groupHotspotsByLocation(hotspots) {
        const grouped = {};
        hotspots.forEach(h => {
            const key = `${h.lat},${h.lng}`;
            if (!grouped[key]) {
                grouped[key] = {
                    location: h.location,
                    lat: h.lat,
                    lng: h.lng,
                    severity: h.severity,
                    reports: [],
                    count: 0
                };
            }
            grouped[key].reports.push(h);
            grouped[key].count = grouped[key].reports.length;
            // Use highest severity
            if (this.getSeverityLevel(h.severity) > this.getSeverityLevel(grouped[key].severity)) {
                grouped[key].severity = h.severity;
            }
        });
        return grouped;
    }

    getSeverityLevel(severity) {
        const levels = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return levels[severity?.toLowerCase()] || 0;
    }

    getReportSeverity(severity) {
        if (!severity) return 'low';
        const s = severity.toLowerCase();
        if (s.includes('critical') || s.includes('emergency')) return 'critical';
        if (s.includes('high') || s.includes('severe')) return 'high';
        if (s.includes('medium') || s.includes('moderate')) return 'medium';
        return 'low';
    }

    initMap() {
        if (this.map) {
            this.renderMarkers();
            return;
        }

        const mapElement = document.getElementById('goaMap');
        if (!mapElement) return;

        // Center map on Goa with proper coordinates
        this.map = L.map('goaMap', {
            scrollWheelZoom: true,
            zoomAnimation: true
        }).setView([15.5, 73.8], 9);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Initialize layer groups for filtering
        this.markerLayers = {
            all: L.layerGroup().addTo(this.map),
            high: L.layerGroup(),
            medium: L.layerGroup(),
            low: L.layerGroup()
        };

        // Store markers by location key for easy access
        this.markersByLocation = {};

        this.renderMarkers();

        // Fit bounds if we have markers
        if (this.allHotspots && this.allHotspots.length > 0) {
            setTimeout(() => this.fitMapBounds(), 500);
        }
    }

    fitMapBounds() {
        if (!this.map || !this.allHotspots || this.allHotspots.length === 0) return;

        const bounds = L.latLngBounds();
        this.allHotspots.forEach(h => {
            bounds.extend([h.lat, h.lng]);
        });

        // Add padding
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    async refreshMap() {
        console.log('🔄 Refreshing map data...');
        try {
            const reports = await this.fetchJSON('/api/reports');
            
            this.allHotspots = (reports || []).map(r => ({
                id: r.id,
                location: r.location || 'Unknown Location',
                lat: parseFloat(r.latitude),
                lng: parseFloat(r.longitude),
                description: r.description,
                severity: this.getReportSeverity(r.severity),
                status: r.status || 'pending',
                created_at: r.created_at,
                image: r.image
            })).filter(h => !isNaN(h.lat) && !isNaN(h.lng));

            this.hotspotsGrouped = this.groupHotspotsByLocation(this.allHotspots);
            
            // Preserve current filter
            const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            
            this.renderMarkers();
            this.renderHotspotCards();
            
            console.log('✅ Map refreshed with', this.allHotspots.length, 'reports');
        } catch (err) {
            console.error('Error refreshing map:', err);
        }
    }

    getMarkerIcon(severity) {
        const colors = {
            'critical': '#ef4444',
            'high': '#f97316',
            'medium': '#eab308',
            'low': '#22c55e'
        };

        const color = colors[severity] || '#6b7280';

        return L.divIcon({
            html: `<div class="custom-marker ${severity}">●</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    }

    renderMarkers() {
        if (!this.map) this.initMap();
        if (!this.hotspotsGrouped || Object.keys(this.hotspotsGrouped).length === 0) {
            console.log('⚠️ No hotspots to render');
            return;
        }

        // Clear old markers
        Object.values(this.markerLayers).forEach(layer => layer.clearLayers());
        this.markersByLocation = {};

        // Get active filter
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

        Object.entries(this.hotspotsGrouped).forEach(([key, hotspot]) => {
            // Skip if doesn't match active filter
            if (activeFilter !== 'all' && hotspot.severity !== activeFilter) {
                return;
            }

            const marker = L.marker([hotspot.lat, hotspot.lng], {
                icon: this.getMarkerIcon(hotspot.severity)
            });

            // Store marker for easy access
            this.markersByLocation[key] = { marker, hotspot };

            // Create custom popup with better styling
            const lastUpdated = new Date(hotspot.reports[0]?.created_at).toLocaleDateString();
            const popupContent = `
                <div class="pollution-popup">
                    <div class="popup-header">
                        <div class="popup-dot ${hotspot.severity}"></div>
                        <div>
                            <p class="popup-title">${this.escapeHtml(hotspot.location)}</p>
                        </div>
                    </div>
                    <div class="popup-details">
                        <div class="popup-detail">
                            <span class="popup-label">Severity:</span>
                            <span class="popup-value">${hotspot.severity.charAt(0).toUpperCase() + hotspot.severity.slice(1)}</span>
                        </div>
                        <div class="popup-detail">
                            <span class="popup-label">Reports:</span>
                            <span class="popup-value">${hotspot.count}</span>
                        </div>
                        <div class="popup-detail">
                            <span class="popup-label">Coordinates:</span>
                            <span class="popup-value">${hotspot.lat.toFixed(4)}, ${hotspot.lng.toFixed(4)}</span>
                        </div>
                        <div class="popup-detail">
                            <span class="popup-label">Last Updated:</span>
                            <span class="popup-value">${lastUpdated}</span>
                        </div>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            
            this.markerLayers.all.addLayer(marker);
            if (this.markerLayers[hotspot.severity]) {
                this.markerLayers[hotspot.severity].addLayer(marker);
            }
        });

        console.log('📌 Rendered markers for', Object.keys(this.markersByLocation).length, 'locations');
    }

    renderHotspotCards() {
        const container = document.getElementById('hotspotsGrid');
        if (!container || !this.hotspotsGrouped) return;

        // Get active filter
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

        // Filter hotspots based on active filter
        const filteredHotspots = Object.values(this.hotspotsGrouped).filter(h => 
            activeFilter === 'all' || h.severity === activeFilter
        );

        // Sort by report count (most affected first)
        filteredHotspots.sort((a, b) => b.count - a.count);

        container.innerHTML = filteredHotspots.length
            ? filteredHotspots.map(h => {
                const latLng = `${h.lat},${h.lng}`;
                const lastReport = h.reports[0];
                const lastUpdated = new Date(lastReport?.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });

                return `
                    <div class="hotspot-card" data-location="${this.escapeHtml(h.location)}" data-latlng="${latLng}">
                        <div class="hotspot-card-header">
                            <div class="hotspot-title-section">
                                <h3 class="hotspot-location">${this.escapeHtml(h.location)}</h3>
                                <span class="hotspot-severity-badge ${h.severity}">${h.severity.toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="hotspot-card-content">
                            <div class="hotspot-stat">
                                <span class="hotspot-stat-label">Reports:</span>
                                <span class="hotspot-stat-value">${h.count}</span>
                            </div>
                            <div class="hotspot-stat">
                                <span class="hotspot-stat-label">Coordinates:</span>
                                <span class="hotspot-stat-value">${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</span>
                            </div>
                            <div class="hotspot-stat">
                                <span class="hotspot-stat-label">Last Updated:</span>
                                <span class="hotspot-stat-value">${lastUpdated}</span>
                            </div>
                            ${lastReport?.description ? `
                            <div class="hotspot-stat">
                                <span class="hotspot-stat-label">Latest Report:</span>
                                <p class="hotspot-description">${this.escapeHtml(lastReport.description.substring(0, 80))}...</p>
                            </div>
                            ` : ''}
                        </div>
                        <button class="btn btn-primary view-on-map-btn" data-latlng="${latLng}">
                            🗺️ View on Map
                        </button>
                    </div>
                `;
            }).join('')
            : `<div class="text-center" style="padding: 2rem; color: var(--muted-foreground);">
                <p>No hotspots found for the selected filter.</p>
            </div>`;
    }

    viewOnMap(latLng) {
        const [lat, lng] = latLng.split(',').map(Number);
        
        if (!this.map) return;

        // Smooth scroll to map
        const mapElement = document.getElementById('goaMap');
        if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Zoom to marker
        setTimeout(() => {
            this.map.setView([lat, lng], 15, { animate: true });

            // Find and open popup
            const key = `${lat},${lng}`;
            if (this.markersByLocation[key]) {
                const marker = this.markersByLocation[key].marker;
                marker.openPopup();
            }
        }, 500);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    /* ---------- MISSIONS ---------- */
    async loadMissions() {
        this.missions = await this.fetchJSON('/api/missions');
        this.renderMissions();
    }

    renderMissions() {
        const container = document.getElementById('missionsGrid');
        if (!container || !this.missions) return;

        container.innerHTML = this.missions.length
            ? this.missions.map(m => `
                <div class="mission-card">
                    ${m.image ? `<img src="${API_BASE}/uploads/${m.image}" alt="${m.title}" class="mission-image">` : ''}
                    <div class="mission-content">
                        <h3>${m.title}</h3>
                        <p>${m.description}</p>
                        <div class="mission-meta">
                            <span>📅 ${new Date(m.date).toLocaleDateString()}</span>
                            <span>📍 ${m.location}</span>
                        </div>
                        <button class="btn btn-primary join-mission-btn" data-mission-id="${m.id}">
                            Join Mission
                        </button>
                    </div>
                </div>
            `).join('')
            : `<p class="text-center">No missions available yet.</p>`;
    }

    openMissionModal(missionId) {
        const mission = this.missions?.find(m => m.id == missionId);
        if (!mission) return;

        document.getElementById('modalTitle').textContent = 'Join Mission';
        document.getElementById('modalMissionTitle').textContent = mission.title;
        document.getElementById('modalMissionDesc').textContent = mission.description;
        document.getElementById('modalDateTime').textContent = new Date(mission.date).toLocaleString();
        document.getElementById('modalLocation').textContent = mission.location;
        document.getElementById('modalDifficulty').textContent = mission.difficulty || 'Moderate';
        if (mission.image) {
            document.getElementById('modalImage').src = `${API_BASE}/uploads/${mission.image}`;
        }
        document.getElementById('confirmJoinBtn').dataset.missionId = missionId;
        document.getElementById('missionModal').classList.add('active');
    }

    showJoinForm(missionId) {
        document.getElementById('missionModal').classList.remove('active');
        const joinModal = document.getElementById('joinModal');
        joinModal.classList.remove('hidden');
        joinModal.classList.add('active');
        document.getElementById('joinForm').dataset.missionId = missionId;
    }

    async handleJoinMission(e) {
        e.preventDefault();
        const form = e.target.closest('form');
        const missionId = form.dataset.missionId;
        const name = document.getElementById('joinName').value;
        const email = document.getElementById('joinEmail').value;
        const phone = document.getElementById('joinPhone').value;

        if (!missionId) {
            this.showToast('Mission ID is missing', 'error');
            console.error('Mission ID missing from form dataset');
            return;
        }

        console.log('Attempting to join mission:', {
            mission_id: missionId,
            name,
            email,
            phone: phone || 'not provided',
            api_url: `${API_BASE}/api/join`
        });

        try {
            // Test connection first
            console.log('Testing connection to:', API_BASE);

            const res = await fetch(`${API_BASE}/api/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    mission_id: missionId,
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone ? phone.trim() : null
                }),
                mode: 'cors'  // Explicitly set CORS mode
            });

            console.log('Response status:', res.status);

            if (!res.ok) {
                let errorMsg = `HTTP ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (parseError) {
                    // Couldn't parse JSON error response
                    const text = await res.text();
                    errorMsg = text || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            console.log('Join mission success:', data);

            this.showToast('Successfully joined mission!', 'success');

            // Close modal
            const joinModal = document.getElementById('joinModal');
            if (joinModal) {
                joinModal.classList.remove('active');
                joinModal.classList.add('hidden');
            }

            // Reset form
            if (form) form.reset();

            // Refresh missions if needed
            if (typeof this.loadMissions === 'function') {
                this.loadMissions();
            }

        } catch (err) {
            console.error('Join mission error details:', err);

            // Provide more specific error messages
            let userMessage = err.message;

            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                userMessage = `Cannot connect to server. Please ensure:
                1. Backend server is running (node server.js)
                2. Port 3000 is accessible
                3. No firewall blocking the connection`;
            } else if (err.message.includes('NetworkError')) {
                userMessage = 'Network error. Check your internet connection.';
            } else if (err.message.includes('CORS')) {
                userMessage = 'CORS error. Server may not be properly configured.';
            }

            this.showToast(userMessage, 'error');

            // Show debug info in console
            console.log('Debug info:');
            console.log('- API_BASE:', API_BASE);
            console.log('- Full URL:', `${API_BASE}/api/join`);
            console.log('- Request body:', {
                mission_id: missionId,
                name,
                email,
                phone
            });
        }
    }

    /* ---------- LEADERBOARD ---------- */
    async loadLeaderboard() {
        this.leaderboard = await this.fetchJSON('/api/leaderboard');
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        if (!this.leaderboard) return;

        // Update stats
        document.getElementById('totalReports')?.setAttribute('data-count', this.leaderboard.totalReports || 0);
        document.getElementById('totalMissions')?.setAttribute('data-count', this.leaderboard.totalMissions || 0);
        document.getElementById('totalTrees')?.setAttribute('data-count', this.leaderboard.totalTrees || 0);

        // Animate numbers
        this.animateCounter('totalReports', this.leaderboard.totalReports || 0);
        this.animateCounter('totalMissions', this.leaderboard.totalMissions || 0);
        this.animateCounter('totalTrees', this.leaderboard.totalTrees || 0);

        // Render top 3 podium with avatars and medals
        const podiumGrid = document.getElementById('podiumGrid');
        if (podiumGrid && Array.isArray(this.leaderboard.top3)) {
            podiumGrid.innerHTML = this.leaderboard.top3.map((user, idx) => {
                const medal = idx === 0 ? '★' : idx === 1 ? '☆' : '✦';
                const cls = idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze';
                const initials = (user.name || 'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                return `
                <div class="podium-item ${cls}">
                    <div class="podium-avatar">${user.avatar || '' || initials}</div>
                    <div class="podium-meta">
                        <div class="podium-name">${user.name}</div>
                        <div class="podium-score">${user.score} pts</div>
                    </div>
                    <div class="podium-medal">${medal}</div>
                </div>`;
            }).join('');
        }

        // Render full leaderboard with avatars, progress bars and subtle animations
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList && Array.isArray(this.leaderboard.list)) {
            // Determine max score for progress bars
            const allScores = [ ...(this.leaderboard.top3 || []).map(u=>u.score || 0), ...(this.leaderboard.list || []).map(u=>u.score || 0) ];
            const maxScore = Math.max(...allScores, 1);

            leaderboardList.innerHTML = this.leaderboard.list.map((user, idx) => {
                const rank = idx + 4; // top3 shown separately
                const initials = (user.name || 'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                const pct = Math.round(((user.score||0) / maxScore) * 100);
                const avatarHtml = user.avatar ? `<img class="leaderboard-avatar" src="${user.avatar}" alt="${user.name}">` : `<div class="avatar-initials">${initials}</div>`;

                return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">${rank}</div>
                    ${avatarHtml}
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${user.name}</div>
                        <div class="leaderboard-location">${user.location || ''}</div>
                        <div class="progress-wrap">
                            <div class="progress-bar" style="width:${pct}%"></div>
                        </div>
                    </div>
                    <div class="leaderboard-points">${user.score} pts</div>
                </div>
                `;
            }).join('');

            // Add staggered fade-in animation
            requestAnimationFrame(()=>{
                leaderboardList.querySelectorAll('.leaderboard-item').forEach((el, i)=>{
                    el.style.animationDelay = `${i * 60}ms`;
                    el.classList.add('fade-in-up');
                });
            });
        }
    }

    animateCounter(id, target) {
        const element = document.getElementById(id);
        if (!element) return;
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 30);
    }

    /* ---------- POLICIES ---------- */
    async loadPolicies() {
        // Load policies and also get report stats for dynamic tracking
        this.policies = await this.fetchJSON('/api/policies');
        this.reportStats = await this.fetchJSON('/api/report-stats');
        this.renderPolicies();
    }

    renderPolicies() {
        // Use report statistics for policy tracker counts
        if (this.reportStats) {
            const stats = this.reportStats;
            // Update policy tracker stats based on reports
            const implementedEl = document.getElementById('implementedCount');
            const inProgressEl = document.getElementById('inProgressCount');
            const pendingEl = document.getElementById('pendingCount');
            const planningEl = document.getElementById('planningCount');

            if (implementedEl) implementedEl.textContent = stats.approved || 0;
            if (inProgressEl) inProgressEl.textContent = stats.pending || 0;
            if (pendingEl) pendingEl.textContent = stats.total || 0;
            if (planningEl) planningEl.textContent = stats.rejected || 0;
        }

        // Render policy cards (if policies exist)
        const policiesList = document.getElementById('policiesList');
        if (policiesList && this.policies && this.policies.length > 0) {
            policiesList.innerHTML = this.policies.map(p => `
                <div class="policy-card">
                    <div class="policy-status ${p.status}">
                        <span>${(p.status || 'pending').replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    <div class="policy-meta">
                        <span>📅 ${new Date(p.created_at).toLocaleDateString()}</span>
                        ${p.deadline ? `<span>⏰ Deadline: ${new Date(p.deadline).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else if (policiesList) {
            // Show report-based policy info if no policies
            policiesList.innerHTML = `
                <div class="policy-card">
                    <div class="policy-status in_progress">
                        <span>LIVE TRACKING</span>
                    </div>
                    <h3>Environmental Reports Tracker</h3>
                    <p>Real-time tracking of environmental issues reported by citizens. Reports are reviewed and addressed by authorities.</p>
                </div>
            `;
        }
    }

    /* ---------- EXPERIENCES ---------- */
    async loadExperiences() {
        this.experiences = await this.fetchJSON('/api/experiences');
        this.renderExperiences();
    }

    renderExperiences() {
        const container = document.getElementById('experiencesGrid');
        if (!container || !this.experiences) return;

        container.innerHTML = this.experiences.length
            ? this.experiences.map(e => `
                <div class="experience-card">
                    ${e.image ? `<img src="${API_BASE}/uploads/${e.image}" alt="${e.name}">` : ''}
                    <div class="experience-content">
                        <span class="experience-category">${e.category}</span>
                        <h3>${e.name}</h3>
                        <p>${e.description}</p>
                        ${e.location ? `<div class="experience-location">📍 ${e.location}</div>` : ''}
                    </div>
                </div>
            `).join('')
            : `<p class="text-center">No experiences available yet.</p>`;
    }

    /* ---------- ECO SPOTS ---------- */
    async loadEcoSpots() {
        this.ecoSpots = await this.fetchJSON('/api/eco-spots');
        this.renderEcoSpots();
    }

    renderEcoSpots() {
        const container = document.getElementById('experiencesGrid');
        if (!container) return;

        // Combine experiences and eco spots
        let html = '';

        if (this.experiences && this.experiences.length > 0) {
            html += this.experiences.map(e => `
                <div class="experience-card">
                    ${e.image ? `<img src="${API_BASE}/uploads/${e.image}" alt="${e.name}">` : ''}
                    <div class="experience-content">
                        <span class="experience-category">${e.category}</span>
                        <h3>${e.name}</h3>
                        <p>${e.description}</p>
                        ${e.location ? `<div class="experience-location">📍 ${e.location}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }

        if (this.ecoSpots && this.ecoSpots.length > 0) {
            html += this.ecoSpots.map(spot => `
                <div class="eco-spot-card">
                    ${spot.image ? `<img src="${API_BASE}/uploads/${spot.image}" alt="${spot.name}">` : ''}
                    <div class="eco-spot-content">
                        <div class="eco-spot-header">
                            <h3>${spot.name}</h3>
                            <div class="eco-spot-rating">⭐ ${spot.rating}</div>
                        </div>
                        <div class="eco-spot-location">📍 ${spot.location}</div>
                        <p class="eco-spot-desc">${spot.description}</p>
                        ${spot.features ? `
                            <div class="eco-spot-features">
                                ${spot.features.split(',').map(f => `<span class="feature-tag">${f.trim()}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${spot.price ? `<div class="eco-spot-price">${spot.price}</div>` : ''}
                        <button class="btn btn-primary know-more-btn" data-spot-id="${spot.id}">
                            Know More
                        </button>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html || '<p class="text-center">No eco spots or experiences available yet.</p>';
    }

    async openEcoSpotModal(spotId) {
        try {
            const spot = await this.fetchJSON(`/api/eco-spots/${spotId}`);
            if (!spot) {
                this.showToast('Eco spot not found', 'error');
                return;
            }

            // Create or update modal
            let modal = document.getElementById('ecoSpotDetailModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'ecoSpotDetailModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content eco-spot-modal-content">
                        <span class="close-modal">&times;</span>
                        <div id="ecoSpotDetailContent"></div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Close modal handlers
                modal.querySelector('.close-modal').onclick = () => {
                    modal.style.display = 'none';
                };
                modal.onclick = (e) => {
                    if (e.target === modal) modal.style.display = 'none';
                };
            }

            const content = document.getElementById('ecoSpotDetailContent');
            content.innerHTML = `
                ${spot.image ? `<img src="${API_BASE}/uploads/${spot.image}" alt="${spot.name}" class="eco-spot-modal-image">` : ''}
                <div class="eco-spot-modal-body">
                    <div class="eco-spot-modal-header">
                        <h2>${spot.name}</h2>
                        <div class="eco-spot-modal-rating">⭐ ${spot.rating}</div>
                    </div>
                    <div class="eco-spot-modal-location">📍 ${spot.location}</div>
                    <p class="eco-spot-modal-description">${spot.description}</p>
                    
                    ${spot.features ? `
                        <div class="eco-spot-modal-section">
                            <h4>Sustainability Features:</h4>
                            <div class="eco-spot-features-list">
                                ${spot.features.split(',').map(f => `<div class="feature-item">✓ ${f.trim()}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${spot.details ? `
                        <div class="eco-spot-modal-section">
                            <h4>Additional Details:</h4>
                            <p>${spot.details}</p>
                        </div>
                    ` : ''}
                    
                    ${spot.price ? `
                        <div class="eco-spot-modal-price">
                            <strong>${spot.price}</strong>
                        </div>
                    ` : ''}
                    
                    ${spot.category ? `
                        <div class="eco-spot-modal-category">
                            <span class="category-badge">${spot.category}</span>
                        </div>
                    ` : ''}
                </div>
            `;

            modal.style.display = 'flex';
        } catch (err) {
            this.showToast('Failed to load eco spot details', 'error');
        }
    }

    /* ---------- MAP FILTERING ---------- */
    filterMapMarkers(filter) {
        if (!this.map || !this.markerLayers) return;

        console.log('🎯 Filtering markers by:', filter);

        // Clear all layers
        Object.values(this.markerLayers).forEach(layer => {
            this.map.removeLayer(layer);
        });

        // Show filtered markers
        if (filter === 'all') {
            this.markerLayers.all.addTo(this.map);
        } else if (this.markerLayers[filter]) {
            this.markerLayers[filter].addTo(this.map);
        }

        console.log(`✅ Map filtered to: ${filter}`);
    }

    /* ---------- UI HELPERS ---------- */
    showToast(msg, type) {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type} active`;
        toast.querySelector('#toastMessage').textContent = msg;
        setTimeout(() => toast.classList.remove('active'), 6000);
    }

    showLoginModal() {
        // Redirect to login page instead of showing modal
        window.location.href = 'login/login.html';
    }

    showSignupModal() {
        // Redirect to signup page instead of showing modal
        window.location.href = 'login/signup.html';
    }

    initViewOnMapButtons() {
        // Listen for dynamically added "View on Map" buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-on-map-btn')) {
                const latLng = e.target.dataset.latlng;
                if (latLng) {
                    this.viewOnMap(latLng);
                }
            }
        });
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }

    initIntersectionObserver() {
        // Get all sections
        const sections = document.querySelectorAll('section[id]');
        
        // Create Intersection Observer options
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50% 0px',  // Trigger when section is 50% visible
            threshold: 0
        };
        
        // Callback function when sections enter/leave viewport
        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    
                    // Remove active class from all nav links
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    
                    // Add active class to matching nav link
                    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        };
        
        // Create observer and observe all sections
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    }
}



/* ---------- START ---------- */
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GoaEcoGuard();
    window.app = app; // Make app globally accessible for onclick handlers
    console.log('🌱 Goa Eco-Guard ready (fully dynamic)');
});

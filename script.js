// Goa Eco-Guard - JavaScript Application

const API_BASE = 'https://eco-guard-backend.onrender.com';

class GoaEcoGuard {
    constructor() {
        this.currentSection = 'home';
        this.joinedMissions = [];
        this.reports = [];
        this.missions = [];
        this.hotspots = [];
        this.leaderboard = [];
        this.policies = [];
        this.experiences = [];
        this.init();
    }

    init() {
        this.initEventListeners();
        this.loadData();
        this.initIntersectionObserver();
        this.showToast('Welcome to Goa Eco-Guard!', 'success');
    }

    // Event Listeners
    initEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.navigateToSection(section);
            }
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuBtn.classList.toggle('active');
                mobileNav.classList.toggle('active');
            });
        }

        // Forms
        const reportingForm = document.getElementById('reportingForm');
        if (reportingForm) {
            reportingForm.addEventListener('submit', (e) => this.handleReportSubmission(e));
        }

        // Heatmap filters
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-filter]')) {
                this.handleHeatmapFilter(e);
            }
        });

        // Mission join buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mission-join-btn')) {
                const missionId = e.target.dataset.missionId;
                if (missionId) {
                    this.openMissionModal(missionId);
                } else {
                    // Handle the case where data is in dataset attributes
                    const missionData = {
                        title: e.target.dataset.title,
                        description: e.target.dataset.description,
                        location: e.target.dataset.location,
                        datetime: e.target.dataset.datetime,
                        difficulty: e.target.dataset.difficulty
                    };
                    this.openMissionModalWithData(missionData);
                }
            }
        });

        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close') || e.target.matches('.modal')) {
                this.closeModal();
            }
        });

        // JOIN MISSION FORM
        const missionModal = document.getElementById("missionModal");
        const joinModal = document.getElementById("joinModal");
        const closeJoin = document.getElementById("closeJoin");
        const confirmJoinBtn = document.getElementById("confirmJoinBtn");

        if (confirmJoinBtn) {
            confirmJoinBtn.addEventListener("click", () => {
                if (missionModal) missionModal.style.display = "none";
                if (joinModal) joinModal.style.display = "flex";
            });
        }

        if (closeJoin) {
            closeJoin.addEventListener("click", () => {
                if (joinModal) joinModal.style.display = "none";
            });
        }

        if (joinModal) {
            window.addEventListener("click", (e) => {
                if (e.target === joinModal) joinModal.style.display = "none";
            });
        }

        // Handle join form submission
        
        const joinForm = document.getElementById("joinForm");
        if (joinForm) {
            joinForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const data = {
                    name: document.getElementById("joinName").value,
                    email: document.getElementById("joinEmail").value,
                    phone: document.getElementById("joinPhone").value
                };

                // Use the deployed backend
                const res = await fetch(`${API_BASE}/api/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                alert(result.message);
                if (joinModal) joinModal.style.display = "none";
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                const mobileNav = document.getElementById('mobileNav');
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                if (mobileNav && mobileNav.classList.contains('active')) {
                    mobileNav.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                }
            }
        });
    }

    // Navigation
    navigateToSection(sectionId) {
        this.currentSection = sectionId;
        
        // Update active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });

        // Smooth scroll to section
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const sectionTop = section.offsetTop - headerHeight;
            
            window.scrollTo({
                top: sectionTop,
                behavior: 'smooth'
            });
        } else if (sectionId === 'home') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Close mobile menu
        const mobileNav = document.getElementById('mobileNav');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileNav && mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    }

    // Intersection Observer for active section highlighting
    initIntersectionObserver() {
        const sections = document.querySelectorAll('.section');
        const options = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    if (sectionId) {
                        this.currentSection = sectionId;
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('data-section') === sectionId) {
                                link.classList.add('active');
                            }
                        });
                    }
                }
            });
        }, options);

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // Data Loading
    loadData() {
        this.loadReportsFromDB();
        this.loadHotspots();
        this.loadMissions();
        this.loadLeaderboard();
        this.loadPolicies();
        this.loadExperiences();
    }

    // Reports Data & Functions
    async loadReportsFromDB() {
        try {
            const res = await fetch(`${API_BASE}/api/reports`);
            const data = await res.json();
            this.reports = data.map(r => ({
                id: r.id,
                location: r.location,
                description: r.description,
                image: r.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
                timestamp: 'Just now',
                status: 'pending',
                severity: 'medium'
            }));
            this.renderReports();
        } catch (error) {
            console.error("Error loading reports:", error);
            // Fallback to sample data if backend is down
            this.loadSampleReports();
        }
    }

    loadSampleReports() {
        this.reports = [
            {
                id: '1',
                location: 'Baga Beach, North Goa',
                description: 'Plastic bottles and food containers scattered along the shoreline after the weekend rush.',
                image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=300&fit=crop',
                timestamp: '2 hours ago',
                status: 'verified',
                severity: 'high'
            },
            {
                id: '2',
                location: 'Mandovi River, Panjim',
                description: 'Oil spill spotted near the ferry terminal affecting local fishing activities.',
                image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=300&fit=crop',
                timestamp: '5 hours ago',
                status: 'pending',
                severity: 'high'
            },
            {
                id: '3',
                location: 'Colva Beach South',
                description: 'Illegal waste dumping from nearby construction site during early morning hours.',
                image: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400&h=300&fit=crop',
                timestamp: '1 day ago',
                status: 'resolved',
                severity: 'medium'
            }
        ];
        this.renderReports();
    }

    renderReports() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;

        reportsList.innerHTML = this.reports.map(report => `
            <div class="report-card">
                <div class="report-header">
                    <img src="${report.image}" alt="Report evidence" class="report-image">
                    <div class="report-info">
                        <div class="report-location">${report.location}</div>
                        <div class="report-description">${report.description}</div>
                        <div class="report-meta">
                            <span class="report-time">${report.timestamp}</span>
                            <span class="report-status status-${report.status}">${report.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleReportSubmission(e) {
        e.preventDefault();
        
        const location = document.getElementById('location').value;
        const description = document.getElementById('description').value;
        const image = document.getElementById('image').value;

        if (!location || !description) {
            this.showToast('Please fill in location and description fields.', 'error');
            return;
        }

        // Use the deployed backend
        fetch(`${API_BASE}/api/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location, description, image })
        })
        .then(res => res.json())
        .then(result => {
            this.showToast(result.message, 'success');
            e.target.reset();
            this.loadReportsFromDB(); // This will now fetch from your live backend
        })
        .catch((error) => {
            console.error("Error submitting report:", error);
            this.showToast("Error submitting report. Try again.", "error");
        });
    }

    // Heatmap functions
    loadHotspots() {
    this.hotspots = [
        {
            id: '1',
            location: 'Baga Beach North',
            coordinates: { lat: 15.5579, lng: 73.7557 },
            pollutionLevel: 'high',
            type: 'Plastic Waste',
            lastUpdated: '2 hours ago',
            reports: 8,
            severity: 75
        },
        {
            id: '2',
            location: 'Mandovi River - Ferry Terminal',
            coordinates: { lat: 15.4929, lng: 73.8278 },
            pollutionLevel: 'critical',
            type: 'Oil Spill',
            lastUpdated: '4 hours ago',
            reports: 15,
            severity: 90
        },
        {
            id: '3',
            location: 'Colva Beach South',
            coordinates: { lat: 15.2798, lng: 73.9111 },
            pollutionLevel: 'medium',
            type: 'Construction Debris',
            lastUpdated: '1 day ago',
            reports: 3,
            severity: 45
        },
        {
            id: '4',
            location: 'Anjuna Beach',
            coordinates: { lat: 15.5739, lng: 73.7373 },
            pollutionLevel: 'low',
            type: 'Litter',
            lastUpdated: '2 days ago',
            reports: 2,
            severity: 20
        },
        {
            id: '5',
            location: 'Chapora River Mouth',
            coordinates: { lat: 15.6064, lng: 73.7411 },
            pollutionLevel: 'high',
            type: 'Sewage Discharge',
            lastUpdated: '6 hours ago',
            reports: 6,
            severity: 65
        },
        {
            id: '6',
            location: 'Calangute Beach Central',
            coordinates: { lat: 15.5435, lng: 73.7538 },
            pollutionLevel: 'medium',
            type: 'Food Waste',
            lastUpdated: '12 hours ago',
            reports: 4,
            severity: 40
        },
        {
            id: '7',
            location: 'Palolem Beach',
            coordinates: { lat: 15.0106, lng: 74.0238 },
            pollutionLevel: 'low',
            type: 'Plastic Bottles',
            lastUpdated: '3 days ago',
            reports: 3,
            severity: 25
        },
        {
            id: '8',
            location: 'Morjim Beach',
            coordinates: { lat: 15.6304, lng: 73.7398 },
            pollutionLevel: 'critical',
            type: 'Industrial Waste',
            lastUpdated: '1 hour ago',
            reports: 12,
            severity: 85
        }
    ];

    this.initMap();
    this.renderHotspots();
}

initMap() {
    // Initialize the map
    this.map = L.map('goaMap').setView([15.5000, 73.8000], 10); // Center on Goa

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(this.map);

    // Add scale control
    L.control.scale().addTo(this.map);

    // Create layer groups for different pollution levels
    this.markerLayers = {
        all: L.layerGroup().addTo(this.map),
        critical: L.layerGroup(),
        high: L.layerGroup(),
        medium: L.layerGroup(),
        low: L.layerGroup()
    };

    // Add layer control
    this.initLayerControl();
}

initLayerControl() {
    // Create layer control
    const overlayMaps = {
        "Critical Pollution": this.markerLayers.critical,
        "High Pollution": this.markerLayers.high,
        "Medium Pollution": this.markerLayers.medium,
        "Low Pollution": this.markerLayers.low
    };

    L.control.layers(null, overlayMaps, {
        collapsed: false,
        position: 'topright'
    }).addTo(this.map);
}

getPollutionIcon(level) {
    const iconConfig = {
        critical: {
            color: '#dc2626',
            icon: '🔥',
            size: 30
        },
        high: {
            color: '#ea580c',
            icon: '⚠️',
            size: 28
        },
        medium: {
            color: '#d97706',
            icon: '🔸',
            size: 26
        },
        low: {
            color: '#16a34a',
            icon: '💚',
            size: 24
        }
    };

    const config = iconConfig[level] || iconConfig.medium;

    return L.divIcon({
        html: `
            <div style="
                background: ${config.color};
                width: ${config.size}px;
                height: ${config.size}px;
                border-radius: 50%;
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                animation: pulse 2s infinite;
            ">
                ${config.icon}
            </div>
        `,
        className: 'pollution-marker',
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size / 2]
    });
}

createPopupContent(hotspot) {
    return `
        <div class="pollution-popup">
            <div class="popup-header">
                <div class="popup-dot" style="background: ${this.getPollutionColor(hotspot.pollutionLevel)}"></div>
                <h3 class="popup-title">${hotspot.location}</h3>
            </div>
            <div class="popup-details">
                <div class="popup-detail">
                    <span>Type:</span>
                    <span><strong>${hotspot.type}</strong></span>
                </div>
                <div class="popup-detail">
                    <span>Severity:</span>
                    <span><strong>${hotspot.pollutionLevel.toUpperCase()}</strong></span>
                </div>
                <div class="popup-detail">
                    <span>Reports:</span>
                    <span><strong>${hotspot.reports}</strong></span>
                </div>
                <div class="popup-detail">
                    <span>Last Updated:</span>
                    <span>${hotspot.lastUpdated}</span>
                </div>
                <div class="popup-detail">
                    <span>Coordinates:</span>
                    <span>${hotspot.coordinates.lat.toFixed(4)}, ${hotspot.coordinates.lng.toFixed(4)}</span>
                </div>
            </div>
        </div>
    `;
}

getPollutionColor(level) {
    const colors = {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#d97706',
        low: '#16a34a'
    };
    return colors[level] || '#6b7280';
}

renderHotspots(filter = 'all') {
    // Clear existing markers from all layers
    Object.values(this.markerLayers).forEach(layer => layer.clearLayers());

    const filteredHotspots = filter === 'all' 
        ? this.hotspots 
        : this.hotspots.filter(spot => spot.pollutionLevel === filter);

    // Add markers to the map
    filteredHotspots.forEach(hotspot => {
        const marker = L.marker([hotspot.coordinates.lat, hotspot.coordinates.lng], {
            icon: this.getPollutionIcon(hotspot.pollutionLevel)
        });

        const popupContent = this.createPopupContent(hotspot);
        marker.bindPopup(popupContent);

        // Add to appropriate layers
        this.markerLayers.all.addLayer(marker);
        this.markerLayers[hotspot.pollutionLevel].addLayer(marker);
    });

    // Update hotspot cards
    this.renderHotspotCards(filteredHotspots);

    // Fit map bounds to show all markers if we have any
    if (filteredHotspots.length > 0) {
        const group = new L.featureGroup(filteredHotspots.map(hotspot => 
            L.marker([hotspot.coordinates.lat, hotspot.coordinates.lng])
        ));
        this.map.fitBounds(group.getBounds().pad(0.1));
    }
}

renderHotspotCards(filteredHotspots) {
    const hotspotsGrid = document.getElementById('hotspotsGrid');
    if (!hotspotsGrid) return;

    if (filteredHotspots.length === 0) {
        hotspotsGrid.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                <h3>No Pollution Reports</h3>
                <p style="color: var(--muted-foreground);">No hotspots match your filter.</p>
            </div>
        `;
    } else {
        hotspotsGrid.innerHTML = filteredHotspots.map(hotspot => `
            <div class="hotspot-card" data-hotspot-id="${hotspot.id}">
                <div class="hotspot-header">
                    <div class="hotspot-location">
                        <div class="hotspot-dot ${hotspot.pollutionLevel}"></div>
                        <div class="hotspot-name">${hotspot.location}</div>
                    </div>
                    <span class="hotspot-level level-${hotspot.pollutionLevel}">${hotspot.pollutionLevel}</span>
                </div>
                <div class="hotspot-details">
                    <div><strong>Type:</strong> ${hotspot.type}</div>
                    <div><strong>Reports:</strong> ${hotspot.reports}</div>
                    <div><strong>Last Updated:</strong> ${hotspot.lastUpdated}</div>
                    <div><strong>Coordinates:</strong> ${hotspot.coordinates.lat.toFixed(4)}, ${hotspot.coordinates.lng.toFixed(4)}</div>
                </div>
                <button class="btn btn-outline btn-sm w-full mt-2 view-on-map-btn" 
                        data-lat="${hotspot.coordinates.lat}" 
                        data-lng="${hotspot.coordinates.lng}">
                    View on Map
                </button>
            </div>
        `).join('');

        // Add click handlers for "View on Map" buttons
        this.addMapNavigationHandlers();
    }
}

addMapNavigationHandlers() {
    document.querySelectorAll('.view-on-map-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lat = parseFloat(e.target.dataset.lat);
            const lng = parseFloat(e.target.dataset.lng);
            
            this.map.setView([lat, lng], 15);
            
            // Open popup for the corresponding marker
            this.markerLayers.all.eachLayer((layer) => {
                const markerLat = layer.getLatLng().lat;
                const markerLng = layer.getLatLng().lng;
                
                if (Math.abs(markerLat - lat) < 0.001 && Math.abs(markerLng - lng) < 0.001) {
                    layer.openPopup();
                }
            });
        });
    });
}

handleHeatmapFilter(e) {
    e.preventDefault();

    // Remove active state from all filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active state to clicked button
    e.target.classList.add('active');

    const filter = e.target.getAttribute('data-filter');
    this.renderHotspots(filter);
}
    // Missions Data & Functions
    loadMissions() {
        this.missions = [
            {
                id: '1',
                title: 'Beach Clean-up at Baga',
                description: 'Join us for a morning beach cleanup to remove plastic waste and restore the natural beauty of Goa\'s most popular beach.',
                date: 'Dec 25, 2024',
                time: '7:00 AM - 10:00 AM',
                location: 'Baga Beach, North Goa',
                participants: 23,
                maxParticipants: 50,
                type: 'cleanup',
                difficulty: 'easy',
                image: 'https://images.unsplash.com/photo-1582408921715-18e7806365c1?w=400&h=300&fit=crop'
            },
            {
                id: '2',
                title: 'Tree Plantation at Mollem',
                description: 'Help us plant native species in the Western Ghats buffer zone to restore forest cover and protect biodiversity.',
                date: 'Dec 28, 2024',
                time: '6:00 AM - 12:00 PM',
                location: 'Mollem National Park',
                participants: 15,
                maxParticipants: 30,
                type: 'plantation',
                difficulty: 'medium',
                image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop'
            },
            {
                id: '3',
                title: 'Plastic-Free Drive in Panjim',
                description: 'Awareness campaign to promote eco-friendly alternatives and educate locals about plastic pollution impact.',
                date: 'Jan 2, 2025',
                time: '4:00 PM - 7:00 PM',
                location: 'Panjim City Center',
                participants: 8,
                maxParticipants: 25,
                type: 'awareness',
                difficulty: 'easy',
                image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop'
            },
            {
                id: '4',
                title: 'Turtle Conservation Program',
                description: 'Night patrol and protection of Olive Ridley turtle nesting sites along Goa\'s coastline during nesting season.',
                date: 'Jan 5, 2025',
                time: '8:00 PM - 2:00 AM',
                location: 'Morjim Beach',
                participants: 6,
                maxParticipants: 15,
                type: 'wildlife',
                difficulty: 'hard',
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'
            },
            {
                id: '5',
                title: 'Mangrove Restoration',
                description: 'Restore vital mangrove ecosystems by planting saplings and removing invasive species along the coastline.',
                date: 'Jan 8, 2025',
                time: '7:30 AM - 11:30 AM',
                location: 'Zuari River Estuary',
                participants: 12,
                maxParticipants: 20,
                type: 'plantation',
                difficulty: 'medium',
                image: 'https://images.unsplash.com/photo-1509635022432-0220ac12960b?w=400&h=300&fit=crop'
            },
            {
                id: '6',
                title: 'River Cleanup Drive',
                description: 'Community effort to clean the Mandovi River and install waste collection points to prevent future pollution.',
                date: 'Jan 12, 2025',
                time: '8:00 AM - 1:00 PM',
                location: 'Mandovi Riverfront',
                participants: 19,
                maxParticipants: 40,
                type: 'cleanup',
                difficulty: 'easy',
                image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop'
            }
        ];

        this.renderMissions();
    }

    renderMissions() {
        const missionsGrid = document.getElementById('missionsGrid');
        if (!missionsGrid) return;

        missionsGrid.innerHTML = this.missions.map(mission => {
            const progressPercent = (mission.participants / mission.maxParticipants) * 100;
            const isJoined = this.joinedMissions.includes(mission.id);
            const isFull = mission.participants >= mission.maxParticipants;

            return `
                <div class="mission-card">
                    <div class="mission-image" style="background-image: url('${mission.image}'); position: relative;">
                        <div class="mission-badges">
                            <span class="mission-badge badge-${mission.type}">
                                ${this.getMissionTypeIcon(mission.type)}
                                ${mission.type.charAt(0).toUpperCase() + mission.type.slice(1)}
                            </span>
                            <span class="mission-badge difficulty-${mission.difficulty}">
                                ${mission.difficulty.charAt(0).toUpperCase() + mission.difficulty.slice(1)}
                            </span>
                        </div>
                    </div>
                    <div class="mission-info">
                        <h3 class="mission-title">${mission.title}</h3>
                        <p class="mission-description">${mission.description}</p>
                        
                        <div class="mission-details">
                            <div class="mission-detail">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                ${mission.date} • ${mission.time}
                            </div>
                            <div class="mission-detail">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                ${mission.location}
                            </div>
                            <div class="mission-detail">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                ${mission.participants}/${mission.maxParticipants} volunteers
                            </div>
                        </div>

                        <div class="mission-progress">
                            <div class="mission-progress-text">
                                <span>Progress</span>
                                <span>${progressPercent.toFixed(0)}% Full</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>

                        <button class="btn ${isJoined ? 'btn-success' : 'btn-primary'} w-full mission-join-btn" 
                                data-mission-id="${mission.id}" 
                                ${isFull ? 'disabled' : ''}>
                            ${isJoined ? 'Joined ✓' : isFull ? 'Mission Full' : 'Join Now'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getMissionTypeIcon(type) {
        const icons = {
            cleanup: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18l-2 13H5L3 6z"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
            plantation: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1.5 2.5 1 3.5 1 6.5-2.5.5-3.5 1.5-4 3-1 0-2.5.5-4 1.5z"/><path d="M3 20c0-3 2-5 5-6"/></svg>',
            awareness: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l3-3 7 7 13-13"/></svg>',
            wildlife: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        };
        return icons[type] || '';
    }

    openMissionModal(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        if (!mission) return;

        const modal = document.getElementById('missionModal');
        const modalImage = document.getElementById('modalImage');
        const modalMissionTitle = document.getElementById('modalMissionTitle');
        const modalMissionDesc = document.getElementById('modalMissionDesc');
        const modalDateTime = document.getElementById('modalDateTime');
        const modalLocation = document.getElementById('modalLocation');
        const modalDifficulty = document.getElementById('modalDifficulty');
        const confirmJoinBtn = document.getElementById('confirmJoinBtn');

        if (modalImage) modalImage.src = mission.image;
        if (modalMissionTitle) modalMissionTitle.textContent = mission.title;
        if (modalMissionDesc) modalMissionDesc.textContent = mission.description;
        if (modalDateTime) modalDateTime.textContent = `${mission.date}, ${mission.time}`;
        if (modalLocation) modalLocation.textContent = mission.location;
        if (modalDifficulty) {
            modalDifficulty.textContent = mission.difficulty.charAt(0).toUpperCase() + mission.difficulty.slice(1);
            modalDifficulty.className = `difficulty-${mission.difficulty}`;
        }

        if (confirmJoinBtn) {
            const isJoined = this.joinedMissions.includes(missionId);
            confirmJoinBtn.textContent = isJoined ? 'Joined Successfully ✓' : 'Confirm Join Mission';
            confirmJoinBtn.disabled = isJoined;
            confirmJoinBtn.dataset.missionId = missionId;
        }

        if (modal) {
            modal.style.display = "flex";
            document.body.style.overflow = 'hidden';
        }
    }

    openMissionModalWithData(missionData) {
        const modal = document.getElementById('missionModal');
        const modalMissionTitle = document.getElementById('modalMissionTitle');
        const modalMissionDesc = document.getElementById('modalMissionDesc');
        const modalDateTime = document.getElementById('modalDateTime');
        const modalLocation = document.getElementById('modalLocation');
        const modalDifficulty = document.getElementById('modalDifficulty');

        if (modalMissionTitle) modalMissionTitle.textContent = missionData.title;
        if (modalMissionDesc) modalMissionDesc.textContent = missionData.description;
        if (modalDateTime) modalDateTime.textContent = missionData.datetime;
        if (modalLocation) modalLocation.textContent = missionData.location;
        if (modalDifficulty) {
            modalDifficulty.textContent = missionData.difficulty;
            modalDifficulty.className = `difficulty-${missionData.difficulty.toLowerCase()}`;
        }

        if (modal) {
            modal.style.display = "flex";
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const missionModal = document.getElementById('missionModal');
        const joinModal = document.getElementById('joinModal');
        
        if (missionModal) missionModal.style.display = "none";
        if (joinModal) joinModal.style.display = "none";
        
        document.body.style.overflow = '';
    }

    confirmJoinMission() {
        const confirmJoinBtn = document.getElementById('confirmJoinBtn');
        if (!confirmJoinBtn) return;

        const missionId = confirmJoinBtn.dataset.missionId;
        const mission = this.missions.find(m => m.id === missionId);

        if (!mission || this.joinedMissions.includes(missionId)) {
            this.showToast('You are already registered for this mission.', 'error');
            return;
        }

        this.joinedMissions.push(missionId);
        mission.participants += 1;

        this.renderMissions();
        this.closeModal();

        this.showToast(`You've joined "${mission.title}". Check your email for details.`, 'success');
    }

    // Leaderboard Data & Functions
    loadLeaderboard() {
        this.leaderboard = [
            {
                id: '1',
                name: 'Priya Sharma',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
                points: 2450,
                rank: 1,
                badges: ['Gold Contributor', 'Beach Guardian', 'Tree Warrior'],
                contributions: {
                    reportsSubmitted: 45,
                    missionsCompleted: 12,
                    treesPlanted: 25
                },
                location: 'Panjim'
            },
            {
                id: '2',
                name: 'Arjun Menon',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
                points: 2180,
                rank: 2,
                badges: ['Silver Champion', 'Wildlife Protector', 'Clean Beach Hero'],
                contributions: {
                    reportsSubmitted: 38,
                    missionsCompleted: 15,
                    treesPlanted: 20
                },
                location: 'Margao'
            },
            {
                id: '3',
                name: 'Kavitha Nair',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
                points: 1920,
                rank: 3,
                badges: ['Bronze Explorer', 'River Guardian', 'Eco Educator'],
                contributions: {
                    reportsSubmitted: 32,
                    missionsCompleted: 8,
                    treesPlanted: 30
                },
                location: 'Mapusa'
            },
            {
                id: '4',
                name: 'Rohit Desai',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                points: 1650,
                rank: 4,
                badges: ['Rising Star', 'Pollution Fighter'],
                contributions: {
                    reportsSubmitted: 28,
                    missionsCompleted: 6,
                    treesPlanted: 15
                },
                location: 'Calangute'
            },
            {
                id: '5',
                name: 'Anita Fernandes',
                avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
                points: 1420,
                rank: 5,
                badges: ['Dedicated Volunteer', 'Beach Cleaner'],
                contributions: {
                    reportsSubmitted: 25,
                    missionsCompleted: 9,
                    treesPlanted: 12
                },
                location: 'Anjuna'
            },
            {
                id: '6',
                name: 'Vikram Gaikwad',
                avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f65?w=100&h=100&fit=crop&crop=face',
                points: 1180,
                rank: 6,
                badges: ['Green Warrior', 'Community Helper'],
                contributions: {
                    reportsSubmitted: 20,
                    missionsCompleted: 7,
                    treesPlanted: 18
                },
                location: 'Baga'
            }
        ];

        this.renderLeaderboard();
        this.updateLeaderboardStats();
    }

    renderLeaderboard() {
        const podiumGrid = document.getElementById('podiumGrid');
        const leaderboardList = document.getElementById('leaderboardList');

        if (podiumGrid) {
            const top3 = this.leaderboard.slice(0, 3);
            // Reorder for podium display: 2nd, 1st, 3rd
            const podiumOrder = [top3[1], top3[0], top3[2]];

            podiumGrid.innerHTML = podiumOrder.map((entry, index) => {
                const actualRank = entry.rank;
                return `
                    <div class="podium-card rank-${actualRank} animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
                        <div class="podium-rank">
                            ${this.getRankIcon(actualRank)}
                        </div>
                        <img src="${entry.avatar}" alt="${entry.name}" class="podium-avatar">
                        <h3 class="podium-name">${entry.name}</h3>
                        <p class="podium-location">${entry.location}</p>
                        <div class="podium-points">${entry.points.toLocaleString()} pts</div>
                        <div class="podium-badges">
                            ${entry.badges.slice(0, 2).map(badge => `
                                <span class="podium-badge ${this.getBadgeClass(badge)}">${badge}</span>
                            `).join('')}
                        </div>
                        <div class="podium-contributions">
                            <div class="contribution-item">
                                <div class="contribution-number">${entry.contributions.reportsSubmitted}</div>
                                <div class="contribution-label">Reports</div>
                            </div>
                            <div class="contribution-item">
                                <div class="contribution-number">${entry.contributions.missionsCompleted}</div>
                                <div class="contribution-label">Missions</div>
                            </div>
                            <div class="contribution-item">
                                <div class="contribution-number">${entry.contributions.treesPlanted}</div>
                                <div class="contribution-label">Trees</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (leaderboardList) {
            const rest = this.leaderboard.slice(3);
            leaderboardList.innerHTML = rest.map(entry => `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">
                        ${this.getRankIcon(entry.rank)}
                    </div>
                    <img src="${entry.avatar}" alt="${entry.name}" class="leaderboard-avatar">
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${entry.name}</div>
                        <div class="leaderboard-location">${entry.location}</div>
                        <div class="leaderboard-badges">
                            ${entry.badges.slice(0, 2).map(badge => `
                                <span class="podium-badge ${this.getBadgeClass(badge)}">${badge}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="leaderboard-points">${entry.points.toLocaleString()} pts</div>
                        <div class="leaderboard-contributions">
                            <div class="contribution-stat">
                                <div style="width: 8px; height: 8px; background: var(--success); border-radius: 50%;"></div>
                                <span>${entry.contributions.reportsSubmitted}</span>
                            </div>
                            <div class="contribution-stat">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                <span>${entry.contributions.missionsCompleted}</span>
                            </div>
                            <div class="contribution-stat">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1.5 2.5 1 3.5 1 6.5-2.5.5-3.5 1.5-4 3-1 0-2.5.5-4 1.5z"/>
                                    <path d="M3 20c0-3 2-5 5-6"/>
                                </svg>
                                <span>${entry.contributions.treesPlanted}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    getRankIcon(rank) {
        const icons = {
            1: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #d97706;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><polyline points="6,9 12,9 12,15"/><polyline points="16,9 20,9 20,15"/><polyline points="12,15 12,9"/><circle cx="12" cy="20" r="1"/></svg>',
            2: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #6b7280;"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/><path d="m21 12-6-6-6 6-6-6"/></svg>',
            3: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ea580c;"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>'
        };
        return icons[rank] || `<div style="width: 24px; height: 24px; background: var(--muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${rank}</div>`;
    }

    getBadgeClass(badge) {
        if (badge.includes('Gold')) return 'badge-gold';
        if (badge.includes('Silver')) return 'badge-silver';
        if (badge.includes('Bronze')) return 'badge-bronze';
        if (badge.includes('Guardian') || badge.includes('Protector')) return 'badge-guardian';
        if (badge.includes('Hero') || badge.includes('Champion')) return 'badge-hero';
        return 'badge-default';
    }

    updateLeaderboardStats() {
        const totalReports = this.leaderboard.reduce((sum, entry) => sum + entry.contributions.reportsSubmitted, 0);
        const totalMissions = this.leaderboard.reduce((sum, entry) => sum + entry.contributions.missionsCompleted, 0);
        const totalTrees = this.leaderboard.reduce((sum, entry) => sum + entry.contributions.treesPlanted, 0);

        const totalReportsEl = document.getElementById('totalReports');
        const totalMissionsEl = document.getElementById('totalMissions');
        const totalTreesEl = document.getElementById('totalTrees');

        if (totalReportsEl) this.animateNumber(totalReportsEl, totalReports);
        if (totalMissionsEl) this.animateNumber(totalMissionsEl, totalMissions);
        if (totalTreesEl) this.animateNumber(totalTreesEl, totalTrees);
    }

    // Policy Data & Functions
    loadPolicies() {
        this.policies = [
            {
                id: '1',
                title: 'Single-Use Plastic Ban Implementation',
                description: 'Complete ban on single-use plastic items including bags, straws, and containers across all establishments in Goa.',
                status: 'implemented',
                progress: 100,
                category: 'waste-management',
                lastUpdated: '2 days ago',
                impact: '85% reduction in plastic waste',
                agency: 'Goa Pollution Control Board',
                timeline: 'Phase 1 Complete'
            },
            {
                id: '2',
                title: 'Beach Clean-up Drive Initiative',
                description: 'Coordinated weekly beach cleaning activities across all major beaches with community participation and monitoring.',
                status: 'in-progress',
                progress: 75,
                category: 'waste-management',
                lastUpdated: '1 week ago',
                impact: '50+ beaches covered weekly',
                agency: 'Department of Environment',
                timeline: 'Ongoing Program'
            },
            {
                id: '3',
                title: 'Mangrove Conservation Project',
                description: 'Protection and restoration of mangrove ecosystems along Goa\'s coastline with community-based conservation programs.',
                status: 'in-progress',
                progress: 60,
                category: 'biodiversity',
                lastUpdated: '3 days ago',
                impact: '500 hectares under protection',
                agency: 'Forest Department',
                timeline: '2024-2026'
            },
            {
                id: '4',
                title: 'Industrial Effluent Monitoring System',
                description: 'Real-time monitoring of industrial discharge into rivers and coastal waters with automated alert systems.',
                status: 'in-progress',
                progress: 45,
                category: 'pollution-control',
                lastUpdated: '5 days ago',
                impact: '24/7 water quality monitoring',
                agency: 'Goa State Pollution Control Board',
                timeline: 'Phase 2 - Dec 2024'
            },
            {
                id: '5',
                title: 'Eco-Tourism Certification Program',
                description: 'Mandatory sustainability certification for all tourism operators with regular audits and compliance monitoring.',
                status: 'pending',
                progress: 25,
                category: 'sustainable-tourism',
                lastUpdated: '2 weeks ago',
                impact: 'Tourism industry transformation',
                agency: 'Department of Tourism',
                timeline: 'Approval Pending'
            },
            {
                id: '6',
                title: 'Solar Energy Mandate for Public Buildings',
                description: 'Requirement for all government buildings to install solar panels and achieve 80% renewable energy usage.',
                status: 'planning',
                progress: 15,
                category: 'renewable-energy',
                lastUpdated: '1 month ago',
                impact: '30% reduction in carbon footprint',
                agency: 'Goa Energy Development Agency',
                timeline: 'Planning Phase'
            },
            {
                id: '7',
                title: 'Coastal Regulation Zone Protection',
                description: 'Stricter enforcement of CRZ regulations with enhanced monitoring and penalties for violations.',
                status: 'implemented',
                progress: 100,
                category: 'biodiversity',
                lastUpdated: '1 week ago',
                impact: 'Zero unauthorized construction',
                agency: 'Coastal Zone Management Authority',
                timeline: 'Enforcement Active'
            },
            {
                id: '8',
                title: 'E-Waste Management Framework',
                description: 'Comprehensive electronic waste collection, processing, and recycling system across all municipalities.',
                status: 'in-progress',
                progress: 55,
                category: 'waste-management',
                lastUpdated: '4 days ago',
                impact: '1000+ tons e-waste processed',
                agency: 'Municipal Corporations',
                timeline: 'Mid-2025 Target'
            }
        ];

        this.renderPolicies();
        this.updatePolicyStats();
    }

    renderPolicies() {
        const policiesList = document.getElementById('policiesList');
        if (!policiesList) return;

        policiesList.innerHTML = this.policies.map(policy => `
            <div class="policy-card">
                <div class="policy-header">
                    <div>
                        <div class="policy-badges">
                            ${this.getPolicyStatusIcon(policy.status)}
                            <span class="policy-badge status-${policy.status}">${policy.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span class="policy-badge category-${policy.category}">${policy.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                        <h3 class="policy-title">${policy.title}</h3>
                    </div>
                    <div style="text-align: right;">
                        <div class="policy-progress-number">${policy.progress}%</div>
                        <div class="policy-progress-label">Complete</div>
                    </div>
                </div>

                <p class="policy-description">${policy.description}</p>

                <div class="policy-progress-bar">
                    <div class="policy-progress-text">
                        <span>Progress</span>
                        <span>${policy.progress}% Complete</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressColorClass(policy.progress)}" style="width: ${policy.progress}%"></div>
                    </div>
                </div>

                <div class="policy-details">
                    <div class="policy-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <div>
                            <div class="policy-detail-label">Agency</div>
                            <div class="policy-detail-value">${policy.agency}</div>
                        </div>
                    </div>
                    <div class="policy-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <div>
                            <div class="policy-detail-label">Timeline</div>
                            <div class="policy-detail-value">${policy.timeline}</div>
                        </div>
                    </div>
                    <div class="policy-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22,4 12,14.01 9,11.01"/>
                        </svg>
                        <div>
                            <div class="policy-detail-label">Impact</div>
                            <div class="policy-detail-value">${policy.impact}</div>
                        </div>
                    </div>
                    <div class="policy-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <div>
                            <div class="policy-detail-label">Last Updated</div>
                            <div class="policy-detail-value">${policy.lastUpdated}</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getPolicyStatusIcon(status) {
        const icons = {
            implemented: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--success);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
            'in-progress': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
            pending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--warning);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            planning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--muted-foreground);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>'
        };
        return icons[status] || '';
    }

    getProgressColorClass(progress) {
        if (progress === 100) return 'bg-success';
        if (progress >= 70) return 'bg-primary';
        if (progress >= 40) return 'bg-warning';
        return 'bg-muted-foreground';
    }

    updatePolicyStats() {
        const statusCounts = this.policies.reduce((acc, policy) => {
            acc[policy.status] = (acc[policy.status] || 0) + 1;
            return acc;
        }, {});

        const implementedEl = document.getElementById('implementedCount');
        const inProgressEl = document.getElementById('inProgressCount');
        const pendingEl = document.getElementById('pendingCount');
        const planningEl = document.getElementById('planningCount');

        if (implementedEl) this.animateNumber(implementedEl, statusCounts.implemented || 0);
        if (inProgressEl) this.animateNumber(inProgressEl, statusCounts['in-progress'] || 0);
        if (pendingEl) this.animateNumber(pendingEl, statusCounts.pending || 0);
        if (planningEl) this.animateNumber(planningEl, statusCounts.planning || 0);
    }

    // Experiences Data & Functions (Eco Guide)
    loadExperiences() {
        this.experiences = [
            {
                id: '1',
                title: 'Eco-Luxury Beach Resort',
                description: 'Solar-powered beachfront resort with organic gardens, rainwater harvesting, and zero-waste practices.',
                location: 'Agonda Beach',
                category: 'stay',
                rating: 4.8,
                ecoScore: 95,
                image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop',
                highlights: ['Solar Energy', 'Organic Gardens', 'Zero Waste', 'Beach Conservation'],
                price: '₹8,000/night',
                sustainability: ['100% renewable energy', 'Local sourcing', 'Wildlife protection']
            },
            {
                id: '2',
                title: 'Western Ghats Trekking',
                description: 'Guided eco-trekking through pristine forests with local tribal communities and wildlife spotting.',
                location: 'Mollem National Park',
                category: 'activity',
                rating: 4.9,
                ecoScore: 98,
                image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
                highlights: ['Biodiversity Hotspot', 'Tribal Culture', 'Wildlife Spotting', 'Conservation Education'],
                price: '₹2,500/person',
                sustainability: ['Community-based tourism', 'Conservation funding', 'Low-impact trails']
            },
            {
                id: '3',
                title: 'Electric Vehicle Tours',
                description: 'Silent electric vehicle tours of Goa\'s countryside, visiting organic farms and traditional villages.',
                location: 'Bicholim & Sattari',
                category: 'transport',
                rating: 4.6,
                ecoScore: 90,
                image: 'https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=400&h=300&fit=crop',
                highlights: ['Zero Emissions', 'Rural Tourism', 'Organic Farms', 'Cultural Heritage'],
                price: '₹1,800/day',
                sustainability: ['Carbon neutral', 'Local employment', 'Agricultural support']
            },
            {
                id: '4',
                title: 'Sustainable Seafood Restaurant',
                description: 'Ocean-to-table dining featuring locally caught sustainable seafood and organic ingredients.',
                location: 'Palolem Beach',
                category: 'dining',
                rating: 4.7,
                ecoScore: 88,
                image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
                highlights: ['Sustainable Fishing', 'Organic Produce', 'Waste Reduction', 'Local Sourcing'],
                price: '₹1,200/meal',
                sustainability: ['Sustainable fishing practices', 'Minimal packaging', 'Composting program']
            },
            {
                id: '5',
                title: 'Mangrove Kayaking Experience',
                description: 'Silent kayaking through mangrove forests with marine biology experts and bird watching.',
                location: 'Cumbarjua Canal',
                category: 'activity',
                rating: 4.8,
                ecoScore: 92,
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
                highlights: ['Mangrove Ecosystem', 'Bird Watching', 'Marine Education', 'Silent Sports'],
                price: '₹1,500/person',
                sustainability: ['Ecosystem preservation', 'Educational impact', 'Non-motorized activity']
            },
            {
                id: '6',
                title: 'Bamboo Eco-Lodge',
                description: 'Traditional bamboo construction with modern comforts, permaculture gardens, and yoga retreats.',
                location: 'Arambol',
                category: 'stay',
                rating: 4.5,
                ecoScore: 85,
                image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
                highlights: ['Bamboo Construction', 'Permaculture', 'Yoga Retreats', 'Wellness Focus'],
                price: '₹4,500/night',
                sustainability: ['Sustainable materials', 'Organic farming', 'Water conservation']
            }
        ];

        this.renderExperiences();
    }

    renderExperiences() {
        const experiencesGrid = document.getElementById('experiencesGrid');
        if (!experiencesGrid) return;

        experiencesGrid.innerHTML = this.experiences.map(experience => `
            <div class="experience-card">
                <div class="experience-image" style="background-image: url('${experience.image}'); position: relative;">
                    <div class="experience-badges">
                        <span class="experience-badge category-${experience.category}">
                            ${this.getCategoryIcon(experience.category)}
                            ${experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
                        </span>
                        <span class="experience-badge">
                            <span class="eco-score score-${Math.floor(experience.ecoScore / 5) * 5}">${experience.ecoScore}% Eco</span>
                        </span>
                    </div>
                </div>
                <div class="experience-info">
                    <div class="experience-header">
                        <h3 class="experience-title">${experience.title}</h3>
                        <div class="experience-rating">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                            </svg>
                            ${experience.rating}
                        </div>
                    </div>
                    <div class="experience-location">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${experience.location}
                    </div>
                    <p class="experience-description">${experience.description}</p>
                    <div class="experience-highlights">
                        ${experience.highlights.slice(0, 3).map(highlight => `
                            <span class="highlight-badge">${highlight}</span>
                        `).join('')}
                    </div>
                    <div class="experience-sustainability">
                        <div class="sustainability-title">Sustainability Features:</div>
                        <ul class="sustainability-list">
                            ${experience.sustainability.slice(0, 2).map(feature => `
                                <li>${feature}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="experience-footer">
                        <div class="experience-price">
                            <span class="price-label">From </span>
                            <span class="price-value">${experience.price}</span>
                        </div>
                        <button class="btn btn-success btn-sm">Know More</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getCategoryIcon(category) {
        const icons = {
            stay: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
            activity: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l3-3 7 7 13-13"/></svg>',
            transport: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10H14l2-6 3.9 2.2c.5.3 1.1.1 1.4-.4.3-.5.1-1.1-.4-1.4L17 2H7l-3.9 2.2c-.5.3-.7.9-.4 1.4.3.5.9.7 1.4.4L8 4l2 6H5.6l-2.1 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
            dining: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1.5 2.5 1 3.5 1 6.5-2.5.5-3.5 1.5-4 3-1 0-2.5.5-4 1.5z"/><path d="M3 20c0-3 2-5 5-6"/></svg>'
        };
        return icons[category] || '';
    }

    // Utility Functions
    animateNumber(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();

        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * this.easeOutQuart(progress));
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        requestAnimationFrame(updateNumber);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.className = `toast ${type} active`;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 4000);
    }

    // Scroll to top functionality
    addScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.innerHTML = '↑';
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            background: var(--primary);
            color: var(--primary-foreground);
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 1000;
            opacity: 0;
            transition: var(--transition);
            box-shadow: var(--shadow-lg);
        `;

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollBtn.style.opacity = '1';
                scrollBtn.style.transform = 'translateY(0)';
            } else {
                scrollBtn.style.opacity = '0';
                scrollBtn.style.transform = 'translateY(1rem)';
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GoaEcoGuard();
    
    // Add scroll to top button
    app.addScrollToTop();
    
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease-in-out';
    }, 100);

    console.log('🌱 Goa Eco-Guard initialized successfully!');
    console.log('🏖️ Welcome to Goa\'s environmental protection platform');
    console.log('🤝 Join us in saving paradise together!');
});
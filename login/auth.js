// Authentication JavaScript
// Production API endpoint (Render)
const API_BASE = 'https://eco-guard-backend.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Handle Login Form
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Simple validation
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            await handleLogin(email, password);
        });
    }
    
    // Handle Signup Form
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const phone = document.getElementById('signupPhone')?.value || '';
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            await handleSignup(name, email, phone, password);
        });
    }
    
    // Switch to signup
    const switchToSignup = document.getElementById('switchToSignup');
    if (switchToSignup) {
        switchToSignup.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'signup.html';
        });
    }
    
    // Switch to login
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }
});

async function handleLogin(email, password) {
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store auth data
        localStorage.setItem('ecoToken', data.token);
        localStorage.setItem('ecoUser', JSON.stringify(data.user));
        
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (data.user.role === 'admin') {
                window.location.href = '../admin/admin.html';
            } else {
                window.location.href = '../index.html';
            }
        }, 1500);
        
    } catch (err) {
        showToast(err.message || 'Login failed. Please try again.', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup(name, email, phone, password) {
    const submitBtn = document.querySelector('#signupForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store auth data
        localStorage.setItem('ecoToken', data.token);
        localStorage.setItem('ecoUser', JSON.stringify(data.user));
        
        showToast('Account created successfully! Redirecting...', 'success');
        
        // Redirect to main page
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        
    } catch (err) {
        showToast(err.message || 'Registration failed. Please try again.', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add toast styles if not already in main CSS
const style = document.createElement('style');
style.textContent = `
.toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    padding: 16px 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
}

.toast-success {
    border-left: 4px solid #10b981;
}

.toast-error {
    border-left: 4px solid #ef4444;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);
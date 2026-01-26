// Global System Object
const ringiSystem = {
    // Determine API Base URL intelligently
    apiBaseUrl: (function() {
        const path = window.location.pathname;
        // Adjust this logic based on your folder structure
        // If current page is /pages/login.html, API is at /api/index.php
        if (path.includes('/pages/')) {
            return '../api/index.php';
        }
        return 'api/index.php';
    })(),

    user: JSON.parse(sessionStorage.getItem('user') || 'null'),

    // --- GENERIC API REQUESTER ---
    apiRequest: async function(method, endpoint, data = null, isMultipart = false) {
        const url = `${this.apiBaseUrl}/${endpoint}`;
        
        const headers = {};
        
        // Only set Content-Type if NOT multipart (FormData handles its own boundary)
        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        // Add Auth Token if available (Mock Session)
        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method, // Ensure method matches 'POST', 'GET', etc.
            headers: headers
        };

        if (data) {
            config.body = isMultipart ? data : JSON.stringify(data);
        }

        try {
            console.log(`[API] ${method} ${url}`, data); // Debug Log
            
            const response = await fetch(url, config);
            
            // Handle non-200 responses safely
            const text = await response.text();
            let json;
            
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("Invalid JSON Response:", text);
                throw new Error(`Server Error (${response.status}): Invalid JSON response`);
            }

            if (!response.ok) {
                throw new Error(json.error || `Server Error (${response.status})`);
            }

            return json;

        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    },

    showNotification: function(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.textContent = message;
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.padding = '15px 25px';
        div.style.backgroundColor = type === 'success' ? '#4CAF50' : (type === 'error' ? '#f44336' : '#2196F3');
        div.style.color = 'white';
        div.style.borderRadius = '4px';
        div.style.zIndex = '9999';
        div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        document.body.appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 3000);
    },
    
    logout: function() {
        sessionStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        window.location.href = 'login.html';
    }
};

// --- AUTH CHECKER ---
document.addEventListener('DOMContentLoaded', () => {
    // Skip auth check for login page
    if (window.location.pathname.endsWith('login.html')) {
        return;
    }

    if (!ringiSystem.user) {
        console.warn("Unauthorized access. Redirecting to login.");
        window.location.href = 'login.html';
    } else {
        // Show User Name if element exists
        const userNameEl = document.getElementById('user-name-display');
        if (userNameEl) {
            userNameEl.textContent = `Login: ${ringiSystem.user.name}`;
        }
    }
});
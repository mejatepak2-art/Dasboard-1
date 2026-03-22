/**
 * Alip Bot Dashboard API Server
 * Standalone server untuk dashboard yang terhubung ke database
 * 
 * Usage:
 * npm install express cors axios dotenv mongodb
 * node dashboard-api.js
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

// Default admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'azizahzjjah@gmail.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'King-paiz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Paiz-king';

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// ==================== AUTHENTICATION ====================
function generateToken(email, username) {
    return Buffer.from(email + ':' + username + ':' + Date.now()).toString('base64');
}

function verifyToken(token) {
    if (!token || token === 'undefined') return false;
    // Simple token verification - in production use JWT
    return token.includes(':');
}

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!verifyToken(token)) {
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized' 
        });
    }
    
    next();
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email required' 
            });
        }

        if (!username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username required' 
            });
        }

        if (!password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password required' 
            });
        }

        // Validate against admin credentials
        if (email !== ADMIN_EMAIL) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email' 
            });
        }

        if (username !== ADMIN_USERNAME) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username' 
            });
        }

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }

        const token = generateToken(email, username);
        
        res.json({
            success: true,
            token,
            userName: username,
            email: email,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard/users', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/users`);
        
        const users = response.data?.users || {};
        const userArray = Object.values(users);
        
        res.json({
            success: true,
            count: userArray.length,
            users: userArray.slice(0, 10)
        });
    } catch (error) {
        console.error('Dashboard users error:', error.message);
        res.json({
            success: false,
            count: 0,
            users: []
        });
    }
});

app.get('/api/dashboard/groups', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/groups`);
        
        const groups = response.data?.groups || {};
        const groupArray = Object.values(groups);
        
        res.json({
            success: true,
            count: groupArray.length,
            groups: groupArray.slice(0, 10)
        });
    } catch (error) {
        console.error('Dashboard groups error:', error.message);
        res.json({
            success: false,
            count: 0,
            groups: []
        });
    }
});

app.get('/api/dashboard/pms', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/pm-logs`);
        
        const pms = response.data?.logs || [];
        const recentPMs = pms.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, 10);
        
        res.json({
            success: true,
            count: pms.length,
            recent: recentPMs
        });
    } catch (error) {
        console.error('Dashboard PMs error:', error.message);
        res.json({
            success: false,
            count: 0,
            recent: []
        });
    }
});

app.get('/api/dashboard/sewa', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/sewa`);
        
        const sewa = response.data?.sewa || [];
        const activeSewa = sewa.filter(s => 
            new Date(s.endDate) > new Date()
        );
        
        res.json({
            success: true,
            total: sewa.length,
            active: activeSewa.length,
            active_list: activeSewa.slice(0, 5)
        });
    } catch (error) {
        console.error('Dashboard sewa error:', error.message);
        res.json({
            success: false,
            total: 0,
            active: 0,
            active_list: []
        });
    }
});

// ==================== PM LOGS ROUTES ====================
app.get('/api/pm-logs', authMiddleware, async (req, res) => {
    try {
        const date = req.query.date;
        const response = await axios.get(`${BOT_API_URL}/db/pm-logs`);
        
        let logs = response.data?.logs || [];
        
        if (date) {
            const filterDate = new Date(date).toDateString();
            logs = logs.filter(log => 
                new Date(log.timestamp).toDateString() === filterDate
            );
        }
        
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            data: logs.slice(0, 100)
        });
    } catch (error) {
        console.error('PM logs error:', error.message);
        res.json({
            success: false,
            data: []
        });
    }
});

app.delete('/api/pm-logs/clear', authMiddleware, async (req, res) => {
    try {
        await axios.delete(`${BOT_API_URL}/db/pm-logs/clear`);
        
        res.json({
            success: true,
            message: 'All PM logs cleared'
        });
    } catch (error) {
        console.error('Clear logs error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to clear logs'
        });
    }
});

app.delete('/api/pm-logs/:id', authMiddleware, async (req, res) => {
    try {
        await axios.delete(`${BOT_API_URL}/db/pm-logs/${req.params.id}`);
        
        res.json({
            success: true,
            message: 'Log deleted'
        });
    } catch (error) {
        console.error('Delete log error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete log'
        });
    }
});

// ==================== SEWA ROUTES ====================
app.get('/api/sewa', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/sewa`);
        
        const sewa = response.data?.sewa || [];
        sewa.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        
        res.json({
            success: true,
            data: sewa
        });
    } catch (error) {
        console.error('Sewa error:', error.message);
        res.json({
            success: false,
            data: []
        });
    }
});

app.get('/api/sewa/:id', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/sewa/${req.params.id}`);
        
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error('Get sewa error:', error.message);
        res.status(404).json({
            success: false,
            message: 'Sewa not found'
        });
    }
});

app.post('/api/sewa', authMiddleware, async (req, res) => {
    try {
        const { jid, endDate, status, startDate } = req.body;
        
        const response = await axios.post(`${BOT_API_URL}/db/sewa`, {
            jid,
            endDate,
            status: status || 'active',
            startDate: startDate || new Date().toISOString()
        });
        
        res.json({
            success: true,
            data: response.data,
            message: 'Sewa added'
        });
    } catch (error) {
        console.error('Add sewa error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add sewa'
        });
    }
});

app.put('/api/sewa/:id', authMiddleware, async (req, res) => {
    try {
        const { jid, endDate, status } = req.body;
        
        const response = await axios.put(`${BOT_API_URL}/db/sewa/${req.params.id}`, {
            jid,
            endDate,
            status
        });
        
        res.json({
            success: true,
            data: response.data,
            message: 'Sewa updated'
        });
    } catch (error) {
        console.error('Update sewa error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update sewa'
        });
    }
});

app.delete('/api/sewa/:id', authMiddleware, async (req, res) => {
    try {
        await axios.delete(`${BOT_API_URL}/db/sewa/${req.params.id}`);
        
        res.json({
            success: true,
            message: 'Sewa deleted'
        });
    } catch (error) {
        console.error('Delete sewa error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete sewa'
        });
    }
});

// ==================== OWNERS ROUTES ====================
app.get('/api/owners', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/owner`);
        
        const owners = response.data?.owners || [];
        
        res.json({
            success: true,
            data: owners
        });
    } catch (error) {
        console.error('Owners error:', error.message);
        res.json({
            success: false,
            data: []
        });
    }
});

app.get('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/db/owner/${req.params.id}`);
        
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error('Get owner error:', error.message);
        res.status(404).json({
            success: false,
            message: 'Owner not found'
        });
    }
});

app.post('/api/owners', authMiddleware, async (req, res) => {
    try {
        const { phone, name, role } = req.body;
        
        const response = await axios.post(`${BOT_API_URL}/db/owner`, {
            phone,
            name,
            role,
            addedDate: new Date().toISOString()
        });
        
        res.json({
            success: true,
            data: response.data,
            message: 'Owner added'
        });
    } catch (error) {
        console.error('Add owner error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add owner'
        });
    }
});

app.put('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        const { phone, name, role } = req.body;
        
        const response = await axios.put(`${BOT_API_URL}/db/owner/${req.params.id}`, {
            phone,
            name,
            role
        });
        
        res.json({
            success: true,
            data: response.data,
            message: 'Owner updated'
        });
    } catch (error) {
        console.error('Update owner error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update owner'
        });
    }
});

app.delete('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        await axios.delete(`${BOT_API_URL}/db/owner/${req.params.id}`);
        
        res.json({
            success: true,
            message: 'Owner deleted'
        });
    } catch (error) {
        console.error('Delete owner error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete owner'
        });
    }
});

// ==================== USERS ROUTES ====================
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const search = req.query.search;
        const response = await axios.get(`${BOT_API_URL}/db/users`);
        
        let users = response.data?.users || {};
        users = Object.keys(users).map(key => ({
            jid: key,
            ...users[key]
        }));
        
        if (search) {
            users = users.filter(u => 
                u.jid.includes(search) || 
                (u.username && u.username.includes(search))
            );
        }
        
        res.json({
            success: true,
            data: users.slice(0, 100)
        });
    } catch (error) {
        console.error('Users error:', error.message);
        res.json({
            success: false,
            data: []
        });
    }
});

// ==================== GROUPS ROUTES ====================
app.get('/api/groups', authMiddleware, async (req, res) => {
    try {
        const search = req.query.search;
        const response = await axios.get(`${BOT_API_URL}/db/groups`);
        
        let groups = response.data?.groups || {};
        groups = Object.keys(groups).map(key => ({
            gid: key,
            ...groups[key]
        }));
        
        if (search) {
            groups = groups.filter(g => 
                g.gid.includes(search) || 
                (g.name && g.name.includes(search))
            );
        }
        
        res.json({
            success: true,
            data: groups.slice(0, 100)
        });
    } catch (error) {
        console.error('Groups error:', error.message);
        res.json({
            success: false,
            data: []
        });
    }
});

// ==================== SETTINGS ROUTES ====================
app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/settings`);
        
        res.json({
            success: true,
            data: response.data || {
                prefix: '.',
                name: 'Alip Bot',
                status: 'online'
            }
        });
    } catch (error) {
        console.error('Settings error:', error.message);
        res.json({
            success: true,
            data: {
                prefix: '.',
                name: 'Alip Bot',
                status: 'online'
            }
        });
    }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
    try {
        const { prefix, name, status } = req.body;
        
        const response = await axios.put(`${BOT_API_URL}/settings`, {
            prefix,
            name,
            status
        });
        
        res.json({
            success: true,
            data: response.data,
            message: 'Settings updated'
        });
    } catch (error) {
        console.error('Update settings error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

app.post('/api/settings/regenerate-key', authMiddleware, async (req, res) => {
    try {
        const newKey = Buffer.from(Math.random().toString()).toString('base64').slice(0, 32);
        
        res.json({
            success: true,
            newKey,
            message: 'API key regenerated'
        });
    } catch (error) {
        console.error('Regenerate key error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate key'
        });
    }
});

// ==================== DASHBOARD CREDENTIALS MANAGEMENT ====================
app.get('/api/credentials', authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            credentials: {
                email: ADMIN_EMAIL,
                username: ADMIN_USERNAME,
                password: '••••••••' // Masked for security
            }
        });
    } catch (error) {
        console.error('Get credentials error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get credentials'
        });
    }
});

app.put('/api/credentials', authMiddleware, async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Validate input
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, username, and password are required'
            });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Update .env file
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Update each credential
        const updateEnvVar = (key, value) => {
            if (envContent.includes(`${key}=`)) {
                envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        };
        
        updateEnvVar('ADMIN_EMAIL', email);
        updateEnvVar('ADMIN_USERNAME', username);
        updateEnvVar('ADMIN_PASSWORD', password);
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        // Update global variables
        global.ADMIN_EMAIL = email;
        global.ADMIN_USERNAME = username;
        global.ADMIN_PASSWORD = password;
        
        res.json({
            success: true,
            message: 'Dashboard credentials updated successfully',
            credentials: {
                email,
                username,
                password: '••••••••' // Masked in response
            }
        });
        
    } catch (error) {
        console.error('Update credentials error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update credentials'
        });
    }
});

app.put('/api/credentials/email', authMiddleware, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Update .env file
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        
        if (envContent.includes('ADMIN_EMAIL=')) {
            envContent = envContent.replace(/ADMIN_EMAIL=.*/, `ADMIN_EMAIL=${email}`);
        } else {
            envContent += `\nADMIN_EMAIL=${email}`;
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        global.ADMIN_EMAIL = email;
        
        res.json({
            success: true,
            message: 'Email updated successfully',
            email
        });
        
    } catch (error) {
        console.error('Update email error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update email'
        });
    }
});

app.put('/api/credentials/username', authMiddleware, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }
        
        // Update .env file
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        
        if (envContent.includes('ADMIN_USERNAME=')) {
            envContent = envContent.replace(/ADMIN_USERNAME=.*/, `ADMIN_USERNAME=${username}`);
        } else {
            envContent += `\nADMIN_USERNAME=${username}`;
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        global.ADMIN_USERNAME = username;
        
        res.json({
            success: true,
            message: 'Username updated successfully',
            username
        });
        
    } catch (error) {
        console.error('Update username error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update username'
        });
    }
});

app.put('/api/credentials/password', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }
        
        // Update .env file
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        
        if (envContent.includes('ADMIN_PASSWORD=')) {
            envContent = envContent.replace(/ADMIN_PASSWORD=.*/, `ADMIN_PASSWORD=${password}`);
        } else {
            envContent += `\nADMIN_PASSWORD=${password}`;
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        global.ADMIN_PASSWORD = password;
        
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
        
    } catch (error) {
        console.error('Update password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update password'
        });
    }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Alip Bot Dashboard API Server Started! 🚀             ║
╠═══════════════════════════════════════════════════════════╣
║  Status: Running                                          ║
║  Port: ${PORT}                                               ║
║  BOT API: ${BOT_API_URL}                                ║
║  Environment: ${process.env.NODE_ENV || 'production'}                               ║
╚═══════════════════════════════════════════════════════════╝
    `);
    
    console.log('📡 API Endpoints:');
    console.log('  • POST   /api/auth/login');
    console.log('  • GET    /api/dashboard/*');
    console.log('  • GET    /api/pm-logs');
    console.log('  • GET    /api/sewa');
    console.log('  • GET    /api/owners');
    console.log('  • GET    /api/users');
    console.log('  • GET    /api/groups');
    console.log('  • GET    /api/settings');
    console.log('');
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

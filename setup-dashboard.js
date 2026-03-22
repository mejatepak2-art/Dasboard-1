#!/usr/bin/env node

/**
 * Alip Bot Dashboard - Quick Start Setup Script
 * Automated setup untuk deployment dashboard
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function header() {
    console.clear();
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║  Alip Bot Dashboard - Quick Start Setup 🚀                ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
    log('');
}

async function prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const displayQuestion = defaultValue ? 
            `${question} [${defaultValue}]: ` : 
            `${question}: `;

        rl.question(displayQuestion, (answer) => {
            rl.close();
            resolve(answer || defaultValue);
        });
    });
}

function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    if (fs.existsSync(envPath)) {
        log('✓ .env file sudah ada', 'green');
        return;
    }
    
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        log('✓ .env file created dari .env.example', 'green');
    }
}

function updateEnvValue(key, value) {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    
    let content = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(envPath, content, 'utf8');
}

async function setupConfiguration() {
    header();
    log('🔧 Konfigurasi Dashboard API', 'blue');
    log('');
    
    createEnvFile();
    log('');
    
    const port = await prompt('Dashboard port', '3000');
    const botUrl = await prompt('Bot Backend API URL', 'http://localhost:3001');
    const password = await prompt('Dashboard password', 'admin123');
    
    updateEnvValue('DASHBOARD_PORT', port);
    updateEnvValue('BOT_API_URL', botUrl);
    updateEnvValue('DASHBOARD_PASSWORD', password);
    
    log('');
    log('✓ Konfigurasi tersimpan di .env', 'green');
}

async function installDependencies() {
    header();
    log('📦 Install Dependencies', 'blue');
    log('');
    
    try {
        log('Installing: express, cors, axios, dotenv...', 'yellow');
        execSync('npm install express cors axios dotenv', { stdio: 'inherit' });
        log('✓ Dependencies installed successfully', 'green');
    } catch (error) {
        log('✗ Failed to install dependencies', 'red');
        log('Please run manually: npm install express cors axios dotenv', 'yellow');
    }
}

async function createDirectories() {
    const directories = [
        path.join(__dirname, 'logs'),
        path.join(__dirname, 'data'),
        path.join(__dirname, 'cache')
    ];
    
    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`✓ Created directory: ${path.basename(dir)}`, 'green');
        }
    }
}

function displayEndpointsList() {
    header();
    log('📡 Available API Endpoints', 'blue');
    log('');
    
    const endpoints = [
        { method: 'POST', path: '/api/auth/login', desc: 'Login ke dashboard' },
        { method: 'GET', path: '/api/dashboard/users', desc: 'Total & recent users' },
        { method: 'GET', path: '/api/dashboard/groups', desc: 'Total & recent groups' },
        { method: 'GET', path: '/api/dashboard/pms', desc: 'Recent PM logs' },
        { method: 'GET', path: '/api/pm-logs', desc: 'Get all PM logs' },
        { method: 'GET', path: '/api/sewa', desc: 'Get all sewa records' },
        { method: 'POST', path: '/api/sewa', desc: 'Add new sewa' },
        { method: 'PUT', path: '/api/sewa/:id', desc: 'Update sewa' },
        { method: 'DELETE', path: '/api/sewa/:id', desc: 'Delete sewa' },
        { method: 'GET', path: '/api/owners', desc: 'Get all owners' },
        { method: 'POST', path: '/api/owners', desc: 'Add owner' },
        { method: 'GET', path: '/api/users', desc: 'Get users (searchable)' },
        { method: 'GET', path: '/api/groups', desc: 'Get groups (searchable)' },
        { method: 'GET', path: '/api/settings', desc: 'Get bot settings' },
        { method: 'PUT', path: '/api/settings', desc: 'Update bot settings' }
    ];
    
    for (const ep of endpoints) {
        const methodColor = ep.method === 'POST' ? 'green' : 
                          ep.method === 'PUT' ? 'yellow' :
                          ep.method === 'DELETE' ? 'red' : 'blue';
        
        log(`  ${colors[methodColor]}${ep.method.padEnd(6)}${colors.reset} ${ep.path.padEnd(30)} ${ep.desc}`);
    }
}

function displayNextSteps() {
    header();
    log('✅ Setup selesai!', 'green');
    log('');
    log('🚀 Langkah selanjutnya:', 'cyan');
    log('');
    log('1. Start Dashboard API Server:', 'bold');
    log('   node dashboard-api.js', 'yellow');
    log('');
    log('2. Buka di browser:', 'bold');
    log('   http://localhost:3000/login.html', 'yellow');
    log('');
    log('3. Login dengan password yang sudah ditetapkan', 'bold');
    log('');
    log('4. Untuk setup lebih lanjut:', 'bold');
    log('   - Edit .env untuk konfigurasi environment', 'yellow');
    log('   - Baca DASHBOARD_DEPLOYMENT.md untuk production setup', 'yellow');
    log('');
    log('📚 Dokumentasi:', 'cyan');
    log('   - DASHBOARD_DEPLOYMENT.md (detailed guide)', 'yellow');
    log('   - .env.example (environment template)', 'yellow');
    log('');
}

async function displayDeploymentOptions() {
    header();
    log('📋 Pilih metode deployment:', 'blue');
    log('');
    log('1. 🏠 Same Machine (Dashboard + API di 1 server)');
    log('2. 🌐 Separate Servers (Dashboard frontend + API backend terpisah)');
    log('3. ☁️  Cloud Deployment (AWS/Heroku/etc)');
    log('');
    
    const choice = await prompt('Pilih nomor (1-3)', '1');
    
    header();
    
    switch (choice) {
        case '1':
            log('🏠 Same Machine Setup', 'cyan');
            log('');
            log('Setup untuk deployment di 1 server:', 'blue');
            log('');
            log('1. Copy semua files ke 1 folder', 'yellow');
            log('2. npm install', 'yellow');
            log('3. Configure .env', 'yellow');
            log('4. node dashboard-api.js', 'yellow');
            log('5. Buka login.html di browser', 'yellow');
            log('');
            log('✓ Semua data files & database di server yang sama', 'green');
            break;
            
        case '2':
            log('🌐 Separate Servers Setup', 'cyan');
            log('');
            log('Dashboard Frontend (Web Server):', 'blue');
            log('  • Copy: login.html, dashboard.html, dashboard.css, dashboard.js', 'yellow');
            log('  • Deploy ke static web hosting (Nginx, Apache, S3, Vercel, etc)', 'yellow');
            log('');
            log('Dashboard API (Node.js Server):', 'blue');
            log('  • Copy: dashboard-api.js, package.json, .env', 'yellow');
            log('  • Deploy ke Node.js hosting (Heroku, Railway, DigitalOcean, etc)', 'yellow');
            log('');
            log('Setup Connection:', 'blue');
            log('  1. At first login, enter API Server URL', 'yellow');
            log('  2. Dashboard akan auto-connect & remember', 'yellow');
            log('  3. Data persists di localStorage', 'yellow');
            log('');
            break;
            
        case '3':
            log('☁️  Cloud Deployment', 'cyan');
            log('');
            log('Supported Platforms:', 'blue');
            log('  • Vercel (frontend)', 'yellow');
            log('  • Railway (API server)', 'yellow');
            log('  • Heroku (API server)', 'yellow');
            log('  • AWS Lambda + API Gateway', 'yellow');
            log('');
            log('Lihat dokumentasi di:', 'green');
            log('  DASHBOARD_DEPLOYMENT.md', 'yellow');
            break;
            
        default:
            log('❌ Pilihan tidak valid', 'red');
    }
    
    log('');
}

async function main() {
    try {
        header();
        log('Welcome! Mari setup Dashboard Alip Bot 🎉', 'green');
        log('');
        
        const skipSetup = process.argv.includes('--skip-config');
        
        if (!skipSetup) {
            // Step 1: Configuration
            await setupConfiguration();
            
            // Step 2: Install Dependencies
            await installDependencies();
        }
        
        // Step 3: Create Directories
        header();
        log('📁 Creating necessary directories...', 'blue');
        await createDirectories();
        
        // Step 4: Display Endpoints
        await new Promise(resolve => setTimeout(resolve, 1000));
        displayEndpointsList();
        
        // Step 5: Deployment Options
        await new Promise(resolve => setTimeout(resolve, 1000));
        await displayDeploymentOptions();
        
        // Step 6: Next Steps
        await new Promise(resolve => setTimeout(resolve, 1000));
        displayNextSteps();
        
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();

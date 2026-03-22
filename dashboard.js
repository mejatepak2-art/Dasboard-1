// Dashboard Configuration
const API_BASE_URL = localStorage.getItem('apiUrl') || 'http://localhost:3000/api';
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Global State
let dashboardState = {
    isConnected: false,
    autoRefresh: true,
    currentSection: 'dashboard',
    userData: {}
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

function initializeDashboard() {
    console.log('🚀 Initializing Dashboard...');
    
    // Check authentication
    const token = localStorage.getItem('dashboardToken');
    if (!token) {
        redirectToLogin();
        return;
    }

    // Load user data
    loadUserProfile();
    
    // Setup auto-refresh
    setInterval(refreshAllData, AUTO_REFRESH_INTERVAL);
    
    // Setup real-time connection
    setupRealtimeConnection();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    // Top bar controls
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('refreshBtn').addEventListener('click', refreshAllData);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) closeModal();
    });

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('regenerateApiKeyBtn').addEventListener('click', regenerateApiKey);
    document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);

    // Management Buttons
    document.getElementById('addSewaBtn').addEventListener('click', () => openAddSewaModal());
    document.getElementById('addOwnerBtn').addEventListener('click', () => openAddOwnerModal());
    document.getElementById('clearPMLogs').addEventListener('click', clearPMLogs);

    // Filters
    document.getElementById('pmDateFilter').addEventListener('change', filterPMLogs);
    document.getElementById('userSearch').addEventListener('input', debounce(searchUsers, 300));
    document.getElementById('groupSearch').addEventListener('input', debounce(searchGroups, 300));
}

// ==================== SECTION SWITCHING ====================
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.add('active');
        dashboardState.currentSection = sectionName;
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Update breadcrumb
    const sectionTitles = {
        'dashboard': 'Dashboard',
        'pm-logs': 'Private Messages',
        'sewa': 'Sewa Management',
        'owners': 'Owner Management',
        'users': 'Users',
        'groups': 'Groups',
        'settings': 'Settings',
        'credentials': 'Credentials'
    };
    document.getElementById('breadcrumbText').textContent = sectionTitles[sectionName] || 'Dashboard';

    // Load section data
    loadSectionData(sectionName);
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'pm-logs':
            loadPMLogs();
            break;
        case 'sewa':
            loadSewaManagement();
            break;
        case 'owners':
            loadOwnersManagement();
            break;
        case 'users':
            loadUsers();
            break;
        case 'groups':
            loadGroups();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'credentials':
            initializeCredentialsSection();
            break;
    }
}

// ==================== DASHBOARD DATA ====================
async function loadDashboardData() {
    try {
        showLoading();

        // Fetch all dashboard data
        const [users, groups, pms, sewa] = await Promise.all([
            apiCall('/dashboard/users'),
            apiCall('/dashboard/groups'),
            apiCall('/dashboard/pms'),
            apiCall('/dashboard/sewa')
        ]);

        // Update stats
        document.getElementById('totalUsers').textContent = users?.count || 0;
        document.getElementById('totalGroups').textContent = groups?.count || 0;
        document.getElementById('totalPMs').textContent = pms?.count || 0;
        document.getElementById('activeSewa').textContent = sewa?.active || 0;

        // Update tables
        updatePMTable(pms?.recent || []);
        updateSewaTable(sewa?.active_list || []);

        hideLoading();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Failed to load dashboard data', 'error');
    }
}

function updatePMTable(data) {
    const tbody = document.getElementById('pmTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No messages</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(pm => `
        <tr>
            <td>
                <strong>${pm.sender?.name || pm.sender}</strong>
            </td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                ${pm.message?.substring(0, 100) || 'N/A'}
            </td>
            <td>${formatTime(pm.timestamp)}</td>
        </tr>
    `).join('');
}

function updateSewaTable(data) {
    const tbody = document.getElementById('sewaTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No active sewa</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(sewa => `
        <tr>
            <td>${sewa.jid}</td>
            <td>${formatDate(sewa.endDate)}</td>
            <td>
                <span class="badge badge-${sewa.status === 'active' ? 'success' : 'warning'}">
                    ${sewa.status}
                </span>
            </td>
        </tr>
    `).join('');
}

// ==================== PM LOGS ====================
async function loadPMLogs() {
    try {
        showLoading();
        const data = await apiCall('/pm-logs');
        
        const tbody = document.getElementById('pmLogsBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No logs found</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(log => `
            <tr>
                <td>${log.id?.substring(0, 8)}...</td>
                <td>${log.sender}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                    ${log.message}
                </td>
                <td>${formatTime(log.timestamp)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="deleteLog('${log.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error loading PM logs:', error);
        showAlert('Failed to load PM logs', 'error');
    }
}

async function filterPMLogs() {
    const date = document.getElementById('pmDateFilter').value;
    if (!date) {
        loadPMLogs();
        return;
    }

    try {
        showLoading();
        const data = await apiCall(`/pm-logs?date=${date}`);
        
        const tbody = document.getElementById('pmLogsBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No logs for this date</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(log => `
            <tr>
                <td>${log.id?.substring(0, 8)}...</td>
                <td>${log.sender}</td>
                <td>${log.message}</td>
                <td>${formatTime(log.timestamp)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="deleteLog('${log.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error filtering logs:', error);
        showAlert('Failed to filter logs', 'error');
    }
}

async function clearPMLogs() {
    if (!confirm('Apakah Anda yakin ingin menghapus semua PM logs?')) return;

    try {
        await apiCall('/pm-logs/clear', 'DELETE');
        showAlert('PM logs cleared successfully', 'success');
        loadPMLogs();
    } catch (error) {
        console.error('Error clearing logs:', error);
        showAlert('Failed to clear logs', 'error');
    }
}

async function deleteLog(logId) {
    if (!confirm('Delete this log?')) return;

    try {
        await apiCall(`/pm-logs/${logId}`, 'DELETE');
        showAlert('Log deleted', 'success');
        loadPMLogs();
    } catch (error) {
        console.error('Error deleting log:', error);
        showAlert('Failed to delete log', 'error');
    }
}

// ==================== SEWA MANAGEMENT ====================
async function loadSewaManagement() {
    try {
        showLoading();
        const data = await apiCall('/sewa');
        
        const tbody = document.getElementById('sewaManagementBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No sewa data</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(sewa => {
            const daysLeft = Math.ceil((new Date(sewa.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const statusClass = daysLeft > 7 ? 'success' : daysLeft > 0 ? 'warning' : 'danger';
            
            return `
                <tr>
                    <td>${sewa.jid}</td>
                    <td>${formatDate(sewa.startDate)}</td>
                    <td>${formatDate(sewa.endDate)}</td>
                    <td>${Math.max(daysLeft, 0)} days</td>
                    <td>
                        <span class="badge badge-${statusClass}">
                            ${sewa.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editSewa('${sewa._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSewa('${sewa._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        hideLoading();
    } catch (error) {
        console.error('Error loading sewa:', error);
        showAlert('Failed to load sewa data', 'error');
    }
}

function openAddSewaModal() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Add New Sewa</h2>
        <div class="form-group">
            <label for="sewaJid">JID</label>
            <input type="text" id="sewaJid" class="form-control" placeholder="Enter JID">
        </div>
        <div class="form-group">
            <label for="sewaEndDate">End Date</label>
            <input type="date" id="sewaEndDate" class="form-control">
        </div>
        <div class="form-group">
            <label for="sewaStatus">Status</label>
            <select id="sewaStatus" class="form-control">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
        <button class="btn btn-success" onclick="saveNewSewa()">
            <i class="fas fa-save"></i> Save
        </button>
    `;
    openModal();
}

async function saveNewSewa() {
    const jid = document.getElementById('sewaJid').value;
    const endDate = document.getElementById('sewaEndDate').value;
    const status = document.getElementById('sewaStatus').value;

    if (!jid || !endDate) {
        showAlert('Please fill all fields', 'warning');
        return;
    }

    try {
        await apiCall('/sewa', 'POST', {
            jid,
            endDate,
            status,
            startDate: new Date().toISOString()
        });
        showAlert('Sewa added successfully', 'success');
        closeModal();
        loadSewaManagement();
    } catch (error) {
        console.error('Error saving sewa:', error);
        showAlert('Failed to save sewa', 'error');
    }
}

async function editSewa(sewaId) {
    try {
        const data = await apiCall(`/sewa/${sewaId}`);
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Edit Sewa</h2>
            <div class="form-group">
                <label for="editSewaJid">JID</label>
                <input type="text" id="editSewaJid" class="form-control" value="${data.jid}">
            </div>
            <div class="form-group">
                <label for="editSewaEndDate">End Date</label>
                <input type="date" id="editSewaEndDate" class="form-control" value="${data.endDate.split('T')[0]}">
            </div>
            <div class="form-group">
                <label for="editSewaStatus">Status</label>
                <select id="editSewaStatus" class="form-control">
                    <option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
            <button class="btn btn-success" onclick="updateSewa('${sewaId}')">
                <i class="fas fa-save"></i> Update
            </button>
        `;
        openModal();
    } catch (error) {
        console.error('Error loading sewa:', error);
        showAlert('Failed to load sewa data', 'error');
    }
}

async function updateSewa(sewaId) {
    const jid = document.getElementById('editSewaJid').value;
    const endDate = document.getElementById('editSewaEndDate').value;
    const status = document.getElementById('editSewaStatus').value;

    try {
        await apiCall(`/sewa/${sewaId}`, 'PUT', { jid, endDate, status });
        showAlert('Sewa updated successfully', 'success');
        closeModal();
        loadSewaManagement();
    } catch (error) {
        console.error('Error updating sewa:', error);
        showAlert('Failed to update sewa', 'error');
    }
}

async function deleteSewa(sewaId) {
    if (!confirm('Delete this sewa?')) return;

    try {
        await apiCall(`/sewa/${sewaId}`, 'DELETE');
        showAlert('Sewa deleted successfully', 'success');
        loadSewaManagement();
    } catch (error) {
        console.error('Error deleting sewa:', error);
        showAlert('Failed to delete sewa', 'error');
    }
}

// ==================== OWNERS MANAGEMENT ====================
async function loadOwnersManagement() {
    try {
        showLoading();
        const data = await apiCall('/owners');
        
        const tbody = document.getElementById('ownersTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No owners</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(owner => `
            <tr>
                <td>${owner.phone}</td>
                <td>${owner.name || 'N/A'}</td>
                <td>${owner.role || 'Member'}</td>
                <td>${formatDate(owner.addedDate)}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editOwner('${owner._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOwner('${owner._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error loading owners:', error);
        showAlert('Failed to load owners', 'error');
    }
}

function openAddOwnerModal() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Add New Owner</h2>
        <div class="form-group">
            <label for="ownerPhone">Phone Number</label>
            <input type="text" id="ownerPhone" class="form-control" placeholder="6282812497034">
        </div>
        <div class="form-group">
            <label for="ownerName">Name</label>
            <input type="text" id="ownerName" class="form-control" placeholder="Owner Name">
        </div>
        <div class="form-group">
            <label for="ownerRole">Role</label>
            <input type="text" id="ownerRole" class="form-control" placeholder="Admin/Moderator">
        </div>
        <button class="btn btn-success" onclick="saveNewOwner()">
            <i class="fas fa-save"></i> Save
        </button>
    `;
    openModal();
}

async function saveNewOwner() {
    const phone = document.getElementById('ownerPhone').value;
    const name = document.getElementById('ownerName').value;
    const role = document.getElementById('ownerRole').value;

    if (!phone) {
        showAlert('Please enter phone number', 'warning');
        return;
    }

    try {
        await apiCall('/owners', 'POST', { phone, name, role });
        showAlert('Owner added successfully', 'success');
        closeModal();
        loadOwnersManagement();
    } catch (error) {
        console.error('Error saving owner:', error);
        showAlert('Failed to save owner', 'error');
    }
}

async function editOwner(ownerId) {
    try {
        const data = await apiCall(`/owners/${ownerId}`);
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Edit Owner</h2>
            <div class="form-group">
                <label for="editOwnerPhone">Phone Number</label>
                <input type="text" id="editOwnerPhone" class="form-control" value="${data.phone}">
            </div>
            <div class="form-group">
                <label for="editOwnerName">Name</label>
                <input type="text" id="editOwnerName" class="form-control" value="${data.name || ''}">
            </div>
            <div class="form-group">
                <label for="editOwnerRole">Role</label>
                <input type="text" id="editOwnerRole" class="form-control" value="${data.role || ''}">
            </div>
            <button class="btn btn-success" onclick="updateOwner('${ownerId}')">
                <i class="fas fa-save"></i> Update
            </button>
        `;
        openModal();
    } catch (error) {
        console.error('Error loading owner:', error);
        showAlert('Failed to load owner', 'error');
    }
}

async function updateOwner(ownerId) {
    const phone = document.getElementById('editOwnerPhone').value;
    const name = document.getElementById('editOwnerName').value;
    const role = document.getElementById('editOwnerRole').value;

    try {
        await apiCall(`/owners/${ownerId}`, 'PUT', { phone, name, role });
        showAlert('Owner updated successfully', 'success');
        closeModal();
        loadOwnersManagement();
    } catch (error) {
        console.error('Error updating owner:', error);
        showAlert('Failed to update owner', 'error');
    }
}

async function deleteOwner(ownerId) {
    if (!confirm('Delete this owner?')) return;

    try {
        await apiCall(`/owners/${ownerId}`, 'DELETE');
        showAlert('Owner deleted successfully', 'success');
        loadOwnersManagement();
    } catch (error) {
        console.error('Error deleting owner:', error);
        showAlert('Failed to delete owner', 'error');
    }
}

// ==================== USERS ====================
async function loadUsers() {
    try {
        showLoading();
        const data = await apiCall('/users');
        
        const tbody = document.getElementById('usersTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No users</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.slice(0, 50).map(user => `
            <tr>
                <td>${user.jid}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.isPremium ? '✓ Yes' : 'No'}</td>
                <td>${user.level || 0}</td>
                <td>${formatTime(user.lastSeen)}</td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users', 'error');
    }
}

async function searchUsers() {
    const query = document.getElementById('userSearch').value;
    if (!query) {
        loadUsers();
        return;
    }

    try {
        showLoading();
        const data = await apiCall(`/users?search=${query}`);
        
        const tbody = document.getElementById('usersTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No results</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(user => `
            <tr>
                <td>${user.jid}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.isPremium ? '✓ Yes' : 'No'}</td>
                <td>${user.level || 0}</td>
                <td>${formatTime(user.lastSeen)}</td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error searching users:', error);
        showAlert('Search failed', 'error');
    }
}

// ==================== GROUPS ====================
async function loadGroups() {
    try {
        showLoading();
        const data = await apiCall('/groups');
        
        const tbody = document.getElementById('groupsTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No groups</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.slice(0, 50).map(group => `
            <tr>
                <td>${group.gid}</td>
                <td>${group.name || 'N/A'}</td>
                <td>${group.participants?.length || 0}</td>
                <td>${group.type || 'Standard'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewGroup('${group.gid}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error loading groups:', error);
        showAlert('Failed to load groups', 'error');
    }
}

async function searchGroups() {
    const query = document.getElementById('groupSearch').value;
    if (!query) {
        loadGroups();
        return;
    }

    try {
        showLoading();
        const data = await apiCall(`/groups?search=${query}`);
        
        const tbody = document.getElementById('groupsTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No results</td></tr>';
            hideLoading();
            return;
        }

        tbody.innerHTML = data.map(group => `
            <tr>
                <td>${group.gid}</td>
                <td>${group.name || 'N/A'}</td>
                <td>${group.participants?.length || 0}</td>
                <td>${group.type || 'Standard'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewGroup('${group.gid}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');

        hideLoading();
    } catch (error) {
        console.error('Error searching groups:', error);
        showAlert('Search failed', 'error');
    }
}

// ==================== SETTINGS ====================
async function loadSettings() {
    try {
        showLoading();
        const data = await apiCall('/settings');
        
        document.getElementById('botPrefix').value = data?.prefix || '.';
        document.getElementById('botName').value = data?.name || 'Alip Bot';
        document.getElementById('botStatusSelect').value = data?.status || 'online';
        document.getElementById('apiKey').value = '••••••••••••••••';

        hideLoading();
    } catch (error) {
        console.error('Error loading settings:', error);
        showAlert('Failed to load settings', 'error');
    }
}

async function saveSettings() {
    const prefix = document.getElementById('botPrefix').value;
    const name = document.getElementById('botName').value;
    const status = document.getElementById('botStatusSelect').value;

    if (!prefix || !name) {
        showAlert('Please fill all fields', 'warning');
        return;
    }

    try {
        await apiCall('/settings', 'PUT', { prefix, name, status });
        showAlert('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Failed to save settings', 'error');
    }
}

async function regenerateApiKey() {
    if (!confirm('Regenerate API key? This will invalidate the old key.')) return;

    try {
        const data = await apiCall('/settings/regenerate-key', 'POST');
        document.getElementById('apiKey').value = data.newKey;
        showAlert('API key regenerated successfully', 'success');
    } catch (error) {
        console.error('Error regenerating key:', error);
        showAlert('Failed to regenerate API key', 'error');
    }
}

function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const btn = document.getElementById('toggleApiKey');
    
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        btn.textContent = 'Hide';
    } else {
        apiKeyInput.type = 'password';
        btn.textContent = 'Show';
    }
}

// ==================== UTILITY FUNCTIONS ====================
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('dashboardToken');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            redirectToLogin();
            return null;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fade-in`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    
    const content = document.querySelector('.content');
    content.insertBefore(alertDiv, content.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function showLoading() {
    // Optional: Add loading indicator
    console.log('Loading...');
}

function hideLoading() {
    // Optional: Hide loading indicator
    console.log('Done loading');
}

function openModal() {
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('modalBody').innerHTML = '';
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
}

function handleSearch(query) {
    if (dashboardState.currentSection === 'users') {
        searchUsers();
    } else if (dashboardState.currentSection === 'groups') {
        searchGroups();
    }
}

function refreshAllData() {
    loadSectionData(dashboardState.currentSection);
    showAlert('Data refreshed', 'info');
}

function loadUserProfile() {
    const userName = localStorage.getItem('userName') || 'Admin';
    document.getElementById('userName').textContent = userName;
}

function setupRealtimeConnection() {
    // Optional: Setup WebSocket for real-time updates
    // This can be implemented later for live data updates
    console.log('Real-time connection setup ready');
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('dashboardToken');
        localStorage.removeItem('userName');
        redirectToLogin();
    }
}

// ==================== CREDENTIALS MANAGEMENT ====================
async function loadCredentials() {
    try {
        const response = await fetch(`${API_BASE_URL}/credentials`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('dashboardToken')}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            document.getElementById('currentEmail').textContent = data.credentials.email;
            document.getElementById('currentUsername').textContent = data.credentials.username;
            document.getElementById('currentPassword').textContent = data.credentials.password;
        } else {
            showAlert('Failed to load credentials', 'error');
        }
    } catch (error) {
        console.error('Load credentials error:', error);
        showAlert('Failed to load credentials', 'error');
    }
}

async function updateCredentials(updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/credentials`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('dashboardToken')}`
            },
            body: JSON.stringify(updates)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadCredentials(); // Refresh display
            clearCredentialForm();
        } else {
            showAlert(data.message || 'Failed to update credentials', 'error');
        }
    } catch (error) {
        console.error('Update credentials error:', error);
        showAlert('Failed to update credentials', 'error');
    }
}

async function updateEmail() {
    const email = document.getElementById('newEmail').value.trim();
    if (!email) {
        showAlert('Please enter an email', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/credentials/email`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('dashboardToken')}`
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadCredentials();
            document.getElementById('newEmail').value = '';
        } else {
            showAlert(data.message || 'Failed to update email', 'error');
        }
    } catch (error) {
        console.error('Update email error:', error);
        showAlert('Failed to update email', 'error');
    }
}

async function updateUsername() {
    const username = document.getElementById('newUsername').value.trim();
    if (!username) {
        showAlert('Please enter a username', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/credentials/username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('dashboardToken')}`
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadCredentials();
            document.getElementById('newUsername').value = '';
        } else {
            showAlert(data.message || 'Failed to update username', 'error');
        }
    } catch (error) {
        console.error('Update username error:', error);
        showAlert('Failed to update username', 'error');
    }
}

async function updatePassword() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!password) {
        showAlert('Please enter a password', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/credentials/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('dashboardToken')}`
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadCredentials();
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showAlert(data.message || 'Failed to update password', 'error');
        }
    } catch (error) {
        console.error('Update password error:', error);
        showAlert('Failed to update password', 'error');
    }
}

function clearCredentialForm() {
    document.getElementById('newEmail').value = '';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function setupCredentialsEventListeners() {
    // Update all credentials
    document.getElementById('updateAllCredentialsBtn').addEventListener('click', () => {
        const email = document.getElementById('newEmail').value.trim();
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!email || !username || !password) {
            showAlert('Please fill in all fields', 'warning');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        updateCredentials({ email, username, password });
    });
    
    // Update individual fields
    document.getElementById('updateEmailBtn').addEventListener('click', updateEmail);
    document.getElementById('updateUsernameBtn').addEventListener('click', updateUsername);
    document.getElementById('updatePasswordBtn').addEventListener('click', updatePassword);
    
    // Refresh credentials
    document.getElementById('refreshCredentialsBtn').addEventListener('click', loadCredentials);
}

// Initialize credentials when section is loaded
function initializeCredentialsSection() {
    loadCredentials();
    setupCredentialsEventListeners();
}

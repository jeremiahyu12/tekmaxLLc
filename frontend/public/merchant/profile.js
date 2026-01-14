// Profile Page JavaScript (Merchant)

let apiKeyVisible = false;
let actualApiKey = '';
let currentUser = null;
let currentDetails = null;

document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
});

async function loadProfileData() {
    try {
        const me = await apiRequest('/auth/me');
        currentUser = me?.user || null;

        const fullName = currentUser
            ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
            : '';

        document.getElementById('accountOwnerName').textContent = fullName || '-';
        document.getElementById('phoneNumber').textContent = currentUser?.phone || 'Not set';
        document.getElementById('email').textContent = currentUser?.email || '-';

        // Billing/contact details
        try {
            currentDetails = await apiRequest('/auth/profile-details');
        } catch (e) {
            currentDetails = null;
        }

        document.getElementById('companyName').textContent = currentDetails?.company_name || '-';
        document.getElementById('billingEmail').textContent = currentDetails?.billing_email || currentUser?.email || '-';
        document.getElementById('billingAddress').textContent = currentDetails?.billing_address || 'Not set';
        document.getElementById('contactName').textContent = currentDetails?.contact_name || fullName || '-';
        document.getElementById('contactPhone').textContent = currentDetails?.contact_phone || 'Not set';

        // API key from integrations
        try {
            const api = await apiRequest('/integrations/api-key');
            if (api?.apiKey) actualApiKey = api.apiKey;
        } catch (e) {
            // ignore
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        alert('Failed to load profile. Please refresh the page.');
    }
}

// Toggle API Key visibility
function toggleApiKey() {
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    const apiKeyToggle = document.getElementById('apiKeyToggle');
    
    if (!apiKeyVisible) {
        // Show API key
        if (actualApiKey) {
            apiKeyDisplay.textContent = actualApiKey;
            apiKeyToggle.textContent = 'Hide';
            apiKeyVisible = true;
        } else {
            apiRequest('/integrations/api-key').then(data => {
                if (data && data.apiKey) {
                    actualApiKey = data.apiKey;
                    apiKeyDisplay.textContent = actualApiKey;
                    apiKeyToggle.textContent = 'Hide';
                    apiKeyVisible = true;
                } else {
                    alert('API key not available');
                }
            }).catch(() => alert('Could not retrieve API key'));
        }
    } else {
        // Hide API key
        apiKeyDisplay.textContent = '********';
        apiKeyToggle.textContent = 'Show';
        apiKeyVisible = false;
    }
}

async function editField(fieldName) {
    if (!currentUser) {
        alert('Profile not loaded yet. Please refresh the page.');
        return;
    }

    // Password special case
    if (fieldName === 'password') {
        return await changePasswordFlow();
    }

    // Name special case (first/last)
    if (fieldName === 'accountOwnerName') {
        const firstName = prompt('First name:', currentUser.first_name || '');
        if (firstName === null) return;
        const lastName = prompt('Last name:', currentUser.last_name || '');
        if (lastName === null) return;

        if (!firstName.trim() || !lastName.trim()) {
            alert('First name and last name are required.');
            return;
        }

        await apiRequest('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: currentUser.email,
                phone: currentUser.phone || null
            })
        });

        await loadProfileData();
        alert('Name updated.');
        return;
    }

    // Merchant user fields
    if (fieldName === 'email' || fieldName === 'phoneNumber') {
        const label = fieldName === 'email' ? 'Email' : 'Phone number';
        const current = fieldName === 'email' ? currentUser.email : (currentUser.phone || '');
        const val = prompt(`${label}:`, current);
        if (val === null) return;
        if (!val.trim()) {
            alert(`${label} cannot be empty.`);
            return;
        }
        if (fieldName === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val.trim())) {
                alert('Please enter a valid email address.');
                return;
            }
        }

        await apiRequest('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify({
                firstName: currentUser.first_name,
                lastName: currentUser.last_name,
                email: fieldName === 'email' ? val.trim() : currentUser.email,
                phone: fieldName === 'phoneNumber' ? val.trim() : (currentUser.phone || null),
            })
        });

        await loadProfileData();
        alert(`${label} updated.`);
        return;
    }

    // Billing/contact details
    const map = {
        companyName: { key: 'company_name', label: 'Company name', current: currentDetails?.company_name || '' },
        billingEmail: { key: 'billing_email', label: 'Billing email', current: currentDetails?.billing_email || currentUser.email || '' },
        billingAddress: { key: 'billing_address', label: 'Billing address', current: currentDetails?.billing_address || '' },
        contactName: { key: 'contact_name', label: 'Contact name', current: currentDetails?.contact_name || '' },
        contactPhone: { key: 'contact_phone', label: 'Contact phone', current: currentDetails?.contact_phone || '' },
    };

    const cfg = map[fieldName];
    if (!cfg) {
        alert('Unknown field.');
        return;
    }

    const val = prompt(`${cfg.label}:`, cfg.current);
    if (val === null) return;

    await apiRequest('/auth/profile-details', {
        method: 'PATCH',
        body: JSON.stringify({ [cfg.key]: val.trim() || null })
    });

    await loadProfileData();
    alert(`${cfg.label} updated.`);
}

async function changePasswordFlow() {
    const currentPassword = prompt('Current password:');
    if (currentPassword === null) return;
    const newPassword = prompt('New password (min 8 chars):');
    if (newPassword === null) return;
    if (newPassword.length < 8) {
        alert('New password must be at least 8 characters.');
        return;
    }
    const confirmPassword = prompt('Confirm new password:');
    if (confirmPassword === null) return;
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }
    if (newPassword === currentPassword) {
        alert('New password must be different from current password.');
        return;
    }

    await apiRequest('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
    });

    alert('Password changed successfully.');
}

// handleLogout is now defined in merchant-common.js

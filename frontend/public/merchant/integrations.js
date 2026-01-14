// Copy API Key
function copyApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (!apiKeyInput || !apiKeyInput.value) {
        alert('No API key available. Please wait for it to load.');
        return;
    }
    
    apiKeyInput.select();
    apiKeyInput.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Generate Email Address
async function generateEmailAddress() {
    try {
        const response = await apiRequest('/integrations/integration-email', {
            method: 'POST',
        });
        
        if (response?.integrationEmail) {
            const emailInput = document.getElementById('integrationEmailInput');
            if (emailInput) {
                emailInput.value = response.integrationEmail;
            }
            alert('Integration email address generated successfully!');
        }
    } catch (error) {
        console.error('Error generating integration email:', error);
        alert('Failed to generate integration email. Please try again.');
    }
}

// Add API Link
function addApiLink() {
    const apiLink = prompt('Enter your API link:');
    if (apiLink) {
        alert('API link added successfully!');
        // In production, save to backend
    }
}

// Upgrade Account
function upgradeAccount() {
    alert('Upgrade to premium to unlock webhook features!');
}

// Show API Credentials
function showApiCredentials() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const emailInput = document.getElementById('integrationEmailInput');
    
    let message = 'API Credentials:\n\n';
    if (apiKeyInput && apiKeyInput.value) {
        message += `API Key: ${apiKeyInput.value}\n`;
    } else {
        message += 'API Key: Not generated yet\n';
    }
    if (emailInput && emailInput.value) {
        message += `Integration Email: ${emailInput.value}\n`;
    } else {
        message += 'Integration Email: Not generated yet\n';
    }
    
    alert(message);
}

// Copy Gloria Food API Key
function copyGloriaFoodApiKey() {
    const apiKeyInput = document.getElementById('gloriaFoodApiKeyInput');
    if (!apiKeyInput || !apiKeyInput.value) {
        alert('No Gloria Food API key available. Please wait for it to load.');
        return;
    }
    
    apiKeyInput.select();
    apiKeyInput.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Copy Gloria Food Webhook URL
function copyGloriaFoodWebhookUrl() {
    const webhookUrlInput = document.getElementById('gloriaFoodWebhookUrlInput');
    if (!webhookUrlInput || !webhookUrlInput.value) {
        alert('No webhook URL available. Please wait for it to load.');
        return;
    }
    
    webhookUrlInput.select();
    webhookUrlInput.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Load API Key (if available)
async function loadApiKey() {
    try {
        const data = await apiRequest('/integrations/api-key');
        if (data?.apiKey) {
            const apiKeyInput = document.getElementById('apiKeyInput');
            if (apiKeyInput) {
                apiKeyInput.value = data.apiKey;
            }
        }
        if (data?.integrationEmail) {
            const emailInput = document.getElementById('integrationEmailInput');
            if (emailInput) {
                emailInput.value = data.integrationEmail;
            }
        }
    } catch (error) {
        console.error('Error loading API key:', error);
    }
}

// Load Integration Settings
async function loadIntegrationSettings() {
    try {
        // Load restaurant settings
        const settings = await apiRequest('/integrations/settings');
        
        if (settings?.settings) {
            const s = settings.settings;
            
            // Load Gloria Food settings
            if (s.gloria_food_api_key) {
                document.getElementById('gloriaFoodApiKeyInput').value = s.gloria_food_api_key;
            }
            if (s.gloria_food_store_id) {
                document.getElementById('gloriaFoodStoreIdInput').value = s.gloria_food_store_id;
            }
            if (s.gloria_food_master_key) {
                document.getElementById('gloriaFoodMasterKeyInput').value = s.gloria_food_master_key;
            }
            
            // Update Gloria Food connection status
            if (s.is_gloria_food_connected) {
                updateGloriaFoodStatus(true);
                // Load webhook URL
                const webhookData = await apiRequest('/integrations/gloria-food/api-key');
                if (webhookData?.webhookUrl) {
                    document.getElementById('gloriaFoodWebhookUrlInput').value = webhookData.webhookUrl;
                    document.getElementById('gloriaFoodWebhookSection').style.display = 'block';
                }
            }
            
            // Load DoorDash settings
            if (s.doordash_developer_id) {
                document.getElementById('doorDashDeveloperIdInput').value = s.doordash_developer_id;
            }
            if (s.doordash_key_id) {
                document.getElementById('doorDashKeyIdInput').value = s.doordash_key_id;
            }
            if (s.doordash_signing_secret) {
                document.getElementById('doorDashSigningSecretInput').value = s.doordash_signing_secret;
            }
            if (s.doordash_merchant_id) {
                document.getElementById('doorDashMerchantIdInput').value = s.doordash_merchant_id;
            }
            if (s.doordash_sandbox !== undefined) {
                document.getElementById('doorDashSandboxInput').checked = s.doordash_sandbox;
            }
            
            // Update DoorDash connection status
            if (s.is_doordash_connected) {
                updateDoorDashStatus(true);
            }
        }
        
        // Always load webhook URL for Gloria Food (even if not connected yet)
        try {
            const webhookData = await apiRequest('/integrations/gloria-food/api-key');
            const webhookInput = document.getElementById('gloriaFoodWebhookUrlInput');
            if (webhookInput) {
                if (webhookData?.webhookUrl) {
                    webhookInput.value = webhookData.webhookUrl;
                } else {
                    // Fallback webhook URL (use current site origin)
                    webhookInput.value = `${window.location.origin}/api/webhooks/gloria-food`;
                }
            }
        } catch (error) {
            console.error('Error loading webhook URL:', error);
            const webhookInput = document.getElementById('gloriaFoodWebhookUrlInput');
            if (webhookInput) {
                // Use fallback URL even on error (use current site origin)
                webhookInput.value = `${window.location.origin}/api/webhooks/gloria-food`;
            }
        }
    } catch (error) {
        console.error('Error loading integration settings:', error);
    }
}

// Save Gloria Food Settings
async function saveGloriaFoodSettings() {
    try {
        const apiKey = document.getElementById('gloriaFoodApiKeyInput').value.trim();
        const storeId = document.getElementById('gloriaFoodStoreIdInput').value.trim();
        const masterKey = document.getElementById('gloriaFoodMasterKeyInput').value.trim();
        
        if (!apiKey || !storeId || !masterKey) {
            alert('Please fill in all required fields: API Key, Store ID, and Master Key');
            return;
        }
        
        const response = await apiRequest('/integrations/settings', {
            method: 'PUT',
            body: JSON.stringify({
                gloriaFoodApiKey: apiKey,
                gloriaFoodStoreId: storeId,
                gloriaFoodMasterKey: masterKey,
            }),
        });
        
        if (response?.settings) {
            updateGloriaFoodStatus(true);
            // Load webhook URL
            try {
                const webhookData = await apiRequest('/integrations/gloria-food/api-key');
                const webhookInput = document.getElementById('gloriaFoodWebhookUrlInput');
                if (webhookInput) {
                    if (webhookData?.webhookUrl) {
                        webhookInput.value = webhookData.webhookUrl;
                    } else {
                        webhookInput.value = `${window.location.origin}/api/webhooks/gloria-food`;
                    }
                }
            } catch (error) {
                console.error('Error loading webhook URL after save:', error);
                // Still show success message
            }
            alert('Gloria Food settings saved successfully! Webhook URL is ready to use.');
        }
    } catch (error) {
        console.error('Error saving Gloria Food settings:', error);
        alert('Failed to save Gloria Food settings. Please try again.');
    }
}

// Save DoorDash Settings
async function saveDoorDashSettings() {
    try {
        const developerId = document.getElementById('doorDashDeveloperIdInput').value.trim();
        const keyId = document.getElementById('doorDashKeyIdInput').value.trim();
        const signingSecret = document.getElementById('doorDashSigningSecretInput').value.trim();
        const merchantId = document.getElementById('doorDashMerchantIdInput').value.trim();
        const sandbox = document.getElementById('doorDashSandboxInput').checked;
        
        if (!developerId || !keyId || !signingSecret) {
            alert('Please fill in all required fields: Developer ID, Key ID, and Signing Secret');
            return;
        }
        
        const response = await apiRequest('/integrations/settings', {
            method: 'PUT',
            body: JSON.stringify({
                doordashDeveloperId: developerId,
                doordashKeyId: keyId,
                doordashSigningSecret: signingSecret,
                doordashMerchantId: merchantId || null,
                doordashSandbox: sandbox,
            }),
        });
        
        if (response?.settings) {
            updateDoorDashStatus(true);
            alert('DoorDash settings saved successfully!');
        }
    } catch (error) {
        console.error('Error saving DoorDash settings:', error);
        alert('Failed to save DoorDash settings. Please try again.');
    }
}

// Update Gloria Food Connection Status
function updateGloriaFoodStatus(connected) {
    const badge = document.getElementById('gloriaFoodStatusBadge');
    if (connected) {
        badge.textContent = 'Connected';
        badge.style.background = '#10b981';
        badge.style.color = '#ffffff';
    } else {
        badge.textContent = 'Not Connected';
        badge.style.background = '#ef4444';
        badge.style.color = '#ffffff';
    }
}

// Update DoorDash Connection Status
function updateDoorDashStatus(connected) {
    const badge = document.getElementById('doorDashStatusBadge');
    if (connected) {
        badge.textContent = 'Connected';
        badge.style.background = '#10b981';
        badge.style.color = '#ffffff';
    } else {
        badge.textContent = 'Not Connected';
        badge.style.background = '#ef4444';
        badge.style.color = '#ffffff';
    }
}

// Load Gloria Food Webhook URL (always load on page load)
async function loadGloriaFoodWebhookUrl() {
    try {
        const data = await apiRequest('/integrations/gloria-food/api-key');
        const webhookUrlInput = document.getElementById('gloriaFoodWebhookUrlInput');
        if (webhookUrlInput) {
            if (data?.webhookUrl) {
                webhookUrlInput.value = data.webhookUrl;
            } else {
                // Fallback webhook URL if API doesn't return it
                webhookUrlInput.value = `${window.location.origin}/api/webhooks/gloria-food`;
            }
        }
    } catch (error) {
        console.error('Error loading Gloria Food webhook URL:', error);
        const webhookUrlInput = document.getElementById('gloriaFoodWebhookUrlInput');
        if (webhookUrlInput) {
            // Use fallback URL even on error
            webhookUrlInput.value = `${window.location.origin}/api/webhooks/gloria-food`;
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadIntegrationSettings();
        loadGloriaFoodWebhookUrl();
    });
} else {
    loadIntegrationSettings();
    loadGloriaFoodWebhookUrl();
}

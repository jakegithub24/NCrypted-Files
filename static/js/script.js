// DOM Elements
let currentFile = null;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUploads();
    initializeCopyButtons();
    initializeForms();
});

// File upload functionality
function initializeFileUploads() {
    const fileUploadAreas = document.querySelectorAll('.file-upload-area');
    
    fileUploadAreas.forEach(area => {
        const input = area.querySelector('input[type="file"]');
        const text = area.querySelector('p');
        
        // Click event
        area.addEventListener('click', () => input.click());
        
        // Change event
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                currentFile = file;
                updateFileInfo(area, file);
            }
        });
        
        // Drag and drop events
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                input.files = e.dataTransfer.files;
                currentFile = file;
                updateFileInfo(area, file);
            }
        });
    });
}

function updateFileInfo(area, file) {
    const text = area.querySelector('p');
    const fileSize = formatFileSize(file.size);
    text.innerHTML = `<i class="fas fa-file"></i> ${file.name} (${fileSize})`;
    
    // Add file info display
    let fileInfo = area.querySelector('.file-info');
    if (!fileInfo) {
        fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        area.appendChild(fileInfo);
    }
    
    fileInfo.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-info-circle"></i>
            <div>
                <small>Type: ${file.type || 'Unknown'}</small><br>
                <small>Size: ${fileSize}</small>
            </div>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Copy to clipboard functionality
function initializeCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const target = document.getElementById(targetId);
            
            if (target) {
                target.select();
                document.execCommand('copy');
                
                // Show feedback
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                this.classList.add('btn-success');
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.classList.remove('btn-success');
                }, 2000);
            }
        });
    });
}

// Generate key functionality
function generateKey() {
    showLoading();
    
    fetch('/api/generate_key')
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.key) {
                const keyInput = document.getElementById('encryptionKey');
                if (keyInput) {
                    keyInput.value = data.key;
                    
                    // Show success message
                    showAlert('Key generated successfully! Copy it to a safe place.', 'success');
                    
                    // Auto-scroll to key input
                    keyInput.scrollIntoView({ behavior: 'smooth' });
                }
            }
        })
        .catch(error => {
            hideLoading();
            showAlert('Failed to generate key. Please try again.', 'error');
            console.error('Error:', error);
        });
}

// Form submission
function initializeForms() {
    const encryptForm = document.getElementById('encryptForm');
    const decryptForm = document.getElementById('decryptForm');
    
    if (encryptForm) {
        encryptForm.addEventListener('submit', handleEncryptSubmit);
    }
    
    if (decryptForm) {
        decryptForm.addEventListener('submit', handleDecryptSubmit);
    }
}

function handleEncryptSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const key = formData.get('key');
    const fileInput = form.querySelector('input[type="file"]');
    
    // Validation
    if (!fileInput.files.length) {
        showAlert('Please select a file to encrypt.', 'error');
        return;
    }
    
    if (!key) {
        showAlert('Please enter or generate an encryption key.', 'error');
        return;
    }
    
    if (key.length !== 44) {
        showAlert('Invalid key length. Key must be 44 characters.', 'error');
        return;
    }
    
    showLoading();
    
    fetch('/api/encrypt', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showAlert(data.message, 'success');
            
            // Show download button
            const downloadSection = document.getElementById('downloadSection');
            if (downloadSection) {
                downloadSection.innerHTML = `
                    <div class="alert alert-success-custom">
                        <i class="fas fa-shield-alt fa-lg me-2"></i>
                        <strong>File encrypted successfully!</strong>
                        <p class="mb-0 mt-2">Your file has been encrypted and is ready to download.</p>
                        <a href="/download/encrypted" class="btn btn-custom mt-3" download>
                            <i class="fas fa-download me-2"></i>Download Encrypted File
                        </a>
                    </div>
                `;
                downloadSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            showAlert(data.error || 'Encryption failed', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showAlert('An error occurred. Please try again.', 'error');
        console.error('Error:', error);
    });
}

function handleDecryptSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const key = formData.get('key');
    const fileInput = form.querySelector('input[type="file"]');
    
    // Validation
    if (!fileInput.files.length) {
        showAlert('Please select a file to decrypt.', 'error');
        return;
    }
    
    if (!key) {
        showAlert('Please enter the decryption key.', 'error');
        return;
    }
    
    if (key.length !== 44) {
        showAlert('Invalid key length. Key must be 44 characters.', 'error');
        return;
    }
    
    showLoading();
    
    fetch('/api/decrypt', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showAlert(data.message, 'success');
            
            // Show download button
            const downloadSection = document.getElementById('downloadSection');
            if (downloadSection) {
                downloadSection.innerHTML = `
                    <div class="alert alert-success-custom">
                        <i class="fas fa-lock-open fa-lg me-2"></i>
                        <strong>File decrypted successfully!</strong>
                        <p class="mb-0 mt-2">Your file has been decrypted and is ready to download.</p>
                        <a href="/download/decrypted" class="btn btn-custom mt-3" download>
                            <i class="fas fa-download me-2"></i>Download Decrypted File
                        </a>
                    </div>
                `;
                downloadSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            showAlert(data.error || 'Decryption failed', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showAlert('An error occurred. Please try again.', 'error');
        console.error('Error:', error);
    });
}

// Utility functions
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-dismissible');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertType = type === 'error' ? 'alert-custom' : 'alert-success-custom';
    const icon = type === 'error' ? 'exclamation-triangle' : 'check-circle';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertType} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the beginning of the glass container
    const container = document.querySelector('.glass-container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + E for encrypt page
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        window.location.href = '/encrypt';
    }
    
    // Ctrl/Cmd + D for decrypt page
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        window.location.href = '/decrypt';
    }
    
    // Escape to close alerts
    if (e.key === 'Escape') {
        const alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(alert => {
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) closeBtn.click();
        });
    }
});

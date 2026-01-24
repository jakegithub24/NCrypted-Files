// Enhanced JavaScript with better UX and animations
class NCryptApp {
    constructor() {
        this.currentFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {
        // File upload events
        this.setupFileUpload();
        
        // Form submissions
        this.setupForms();
        
        // Copy buttons
        this.setupCopyButtons();
        
        // Key input tracking
        this.setupKeyInputTracking();
        
        // Alert auto-dismiss
        this.setupAlertAutoDismiss();
    }

    initializeComponents() {
        // Initialize tooltips
        this.initTooltips();
        
        // Add fade-in animations
        this.addPageAnimations();
    }

    setupFileUpload() {
        const uploadAreas = document.querySelectorAll('.file-upload-area');
        
        uploadAreas.forEach(area => {
            const input = area.querySelector('input[type="file"]');
            
            // Click event
            area.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    input.click();
                }
            });
            
            // Change event
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0], area);
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
                    this.handleFileSelect(e.dataTransfer.files[0], area);
                    input.files = e.dataTransfer.files;
                }
            });
        });
    }

    handleFileSelect(file, area) {
        this.currentFile = file;
        this.displayFileInfo(file, area);
        
        // Show success feedback
        this.showAlert('File selected successfully!', 'success');
    }

    displayFileInfo(file, area) {
        const fileInfo = area.nextElementSibling;
        const fileSize = this.formatFileSize(file.size);
        
        fileInfo.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file-check"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        ${fileSize} • ${file.type || 'Unknown type'}
                    </div>
                </div>
            </div>
        `;
        fileInfo.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupForms() {
        const encryptForm = document.getElementById('encryptForm');
        const decryptForm = document.getElementById('decryptForm');
        
        if (encryptForm) {
            encryptForm.addEventListener('submit', (e) => this.handleEncryptSubmit(e));
        }
        
        if (decryptForm) {
            decryptForm.addEventListener('submit', (e) => this.handleDecryptSubmit(e));
        }
    }

    handleEncryptSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const key = formData.get('key').trim();
        const fileInput = form.querySelector('input[type="file"]');
        
        // Validation
        if (!this.validateFileInput(fileInput)) return;
        if (!this.validateKey(key, 'encryption')) return;
        
        // Show progress
        this.showProgress();
        
        // Submit form
        this.submitForm('/api/encrypt', formData, 'encrypt');
    }

    handleDecryptSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const key = formData.get('key').trim();
        const fileInput = form.querySelector('input[type="file"]');
        
        // Validation
        if (!this.validateFileInput(fileInput)) return;
        if (!this.validateKey(key, 'decryption')) return;
        
        // Show progress
        this.showProgress();
        
        // Submit form
        this.submitForm('/api/decrypt', formData, 'decrypt');
    }

    validateFileInput(fileInput) {
        if (!fileInput.files.length) {
            this.showAlert('Please select a file first.', 'error');
            return false;
        }
        
        const file = fileInput.files[0];
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        if (file.size > maxSize) {
            this.showAlert('File size exceeds 50MB limit.', 'error');
            return false;
        }
        
        return true;
    }

    validateKey(key, type) {
        if (!key) {
            this.showAlert(`Please enter ${type} key.`, 'error');
            return false;
        }
        
        if (key.length !== 44) {
            this.showAlert('Key must be exactly 44 characters long.', 'error');
            return false;
        }
        
        // Basic base64 validation
        const base64Regex = /^[A-Za-z0-9\-_]+$/;
        if (!base64Regex.test(key)) {
            this.showAlert('Key contains invalid characters. Must be URL-safe base64.', 'error');
            return false;
        }
        
        return true;
    }

    async submitForm(url, formData, type) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `${type.charAt(0).toUpperCase() + type.slice(1)} failed`);
            }
            
            if (data.success) {
                this.handleSuccess(data, type);
            } else {
                this.showAlert(data.error || `${type.charAt(0).toUpperCase() + type.slice(1)} failed`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert(error.message || `An error occurred during ${type}.`, 'error');
        } finally {
            this.hideProgress();
            this.hideLoading();
        }
    }

    handleSuccess(data, type) {
        this.showAlert(data.message, 'success');
        
        const downloadSection = document.getElementById('downloadSection');
        const action = type === 'encrypt' ? 'encrypted' : 'decrypted';
        const icon = type === 'encrypt' ? 'lock' : 'lock-open';
        const color = type === 'encrypt' ? '#64ffda' : '#9d4edd';
        
        downloadSection.innerHTML = `
            <div class="download-card slide-up">
                <div class="d-flex align-items-center mb-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3" 
                         style="width: 50px; height: 50px; background: ${color};">
                        <i class="fas fa-${icon} fa-lg" style="color: var(--primary-dark);"></i>
                    </div>
                    <div>
                        <h4 class="mb-1">File ${action.charAt(0).toUpperCase() + action.slice(1)} Successfully!</h4>
                        <p class="text-muted mb-0">Your file has been ${action} and is ready to download.</p>
                    </div>
                </div>
                <div class="d-flex gap-3">
                    <a href="/download/${action}" class="btn btn-primary flex-grow-1" download>
                        <i class="fas fa-download me-2"></i>Download ${action.charAt(0).toUpperCase() + action.slice(1)} File
                    </a>
                    <button type="button" class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-sync me-2"></i>Process Another
                    </button>
                </div>
            </div>
        `;
        downloadSection.style.display = 'block';
        
        // Scroll to download section
        downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async generateKey() {
        this.showLoading();
        
        try {
            const response = await fetch('/api/generate_key');
            const data = await response.json();
            
            if (data.key) {
                const keyInput = document.getElementById('encryptionKey');
                if (keyInput) {
                    keyInput.value = data.key;
                    this.updateKeyLength(keyInput.value.length);
                    this.showAlert('New key generated successfully! Copy and save it securely.', 'success');
                    
                    // Auto-copy to clipboard
                    await navigator.clipboard.writeText(data.key);
                    this.showAlert('Key copied to clipboard!', 'success');
                    
                    // Scroll to key input
                    keyInput.focus();
                    keyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        } catch (error) {
            console.error('Error generating key:', error);
            this.showAlert('Failed to generate key. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupCopyButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                const button = e.target.closest('.copy-btn');
                const targetId = button.getAttribute('data-target');
                const target = document.getElementById(targetId);
                
                if (target) {
                    this.copyToClipboard(target.value || target.textContent);
                    
                    // Show feedback
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
                    button.classList.add('btn-success');
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('btn-success');
                    }, 2000);
                }
            }
        });
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    setupKeyInputTracking() {
        const keyInputs = document.querySelectorAll('.key-input');
        
        keyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const length = e.target.value.length;
                this.updateKeyLength(length, e.target.id);
            });
        });
    }

    updateKeyLength(length, inputId) {
        const lengthIndicator = document.getElementById('keyLength');
        if (lengthIndicator) {
            lengthIndicator.textContent = `${length}/44`;
            
            if (length === 44) {
                lengthIndicator.style.color = '#64ffda';
            } else if (length > 44) {
                lengthIndicator.style.color = '#ff6b93';
            } else {
                lengthIndicator.style.color = 'var(--text-muted)';
            }
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer') || document.body;
        const alertId = 'alert-' + Date.now();
        
        const alertDiv = document.createElement('div');
        alertDiv.id = alertId;
        alertDiv.className = `alert alert-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'} slide-up`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <div>
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)}!</strong>
                <p class="mb-0 mt-1">${message}</p>
            </div>
            <button type="button" class="btn-close btn-close-white ms-auto" onclick="document.getElementById('${alertId}').remove()"></button>
        `;
        
        if (alertContainer.id === 'alertContainer') {
            alertContainer.prepend(alertDiv);
        } else {
            // Create a temporary container at the top of the glass card
            const glassCard = document.querySelector('.glass-card');
            if (glassCard) {
                const tempContainer = glassCard.querySelector('#tempAlertContainer') || (() => {
                    const container = document.createElement('div');
                    container.id = 'tempAlertContainer';
                    glassCard.insertBefore(container, glassCard.firstChild);
                    return container;
                })();
                tempContainer.prepend(alertDiv);
            }
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    setupAlertAutoDismiss() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-close')) {
                e.target.closest('.alert').remove();
            }
        });
    }

    showProgress() {
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        if (progressContainer && progressFill && progressPercent) {
            progressContainer.style.display = 'block';
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 1;
                progressFill.style.width = `${Math.min(progress, 90)}%`;
                progressPercent.textContent = `${Math.min(progress, 90)}%`;
                
                if (progress >= 90) {
                    clearInterval(interval);
                }
            }, 30);
        }
        
        this.showLoading();
    }

    hideProgress() {
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        if (progressContainer && progressFill && progressPercent) {
            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressFill.style.width = '0%';
                progressPercent.textContent = '0%';
            }, 500);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    initTooltips() {
        const tooltipElements = document.querySelectorAll('.tooltip');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip);
            element.addEventListener('mouseleave', this.hideTooltip);
        });
    }

    showTooltip(e) {
        const tooltip = e.target.querySelector('.tooltip-text');
        if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
        }
    }

    hideTooltip(e) {
        const tooltip = e.target.querySelector('.tooltip-text');
        if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
        }
    }

    addPageAnimations() {
        // Add animation classes to elements
        const animatedElements = document.querySelectorAll('.fade-in, .slide-up');
        animatedElements.forEach((el, index) => {
            if (el.classList.contains('slide-up')) {
                el.style.animationDelay = `${index * 0.1}s`;
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
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
                document.querySelectorAll('.alert').forEach(alert => {
                    const closeBtn = alert.querySelector('.btn-close');
                    if (closeBtn) closeBtn.click();
                });
            }
            
            // Ctrl/Cmd + G to generate key (on encrypt page)
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && window.location.pathname.includes('/encrypt')) {
                e.preventDefault();
                this.generateKey();
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NCryptApp();
    
    // Make helper functions available globally
    window.generateKey = () => app.generateKey();
    window.showAlert = (message, type) => app.showAlert(message, type);
    window.showLoading = () => app.showLoading();
    window.hideLoading = () => app.hideLoading();
});

// Add smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add intersection observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-item, .stat-card, .action-card').forEach(el => {
    observer.observe(el);
});

// Add page transition effect
window.addEventListener('beforeunload', () => {
    document.body.classList.add('page-exit');
});

// Add back to top button
const backToTop = document.createElement('button');
backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
backToTop.className = 'btn btn-primary back-to-top';
backToTop.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: none;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(100, 255, 218, 0.3);
`;
backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
    backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
});

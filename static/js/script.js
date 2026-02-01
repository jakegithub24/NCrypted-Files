// File Encryption/Decryption Application
class FileEncryptor {
    constructor() {
        this.currentFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupKeyValidation();
        this.setupKeyboardShortcuts();
        this.initBackToTop();
    }

    setupEventListeners() {
        // Form submissions
        const encryptForm = document.getElementById('encryptForm');
        const decryptForm = document.getElementById('decryptForm');
        
        if (encryptForm) {
            encryptForm.addEventListener('submit', (e) => this.handleEncrypt(e));
        }
        
        if (decryptForm) {
            decryptForm.addEventListener('submit', (e) => this.handleDecrypt(e));
        }
        
        // Generate key button
        const generateBtn = document.getElementById('generateKeyBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateKey());
        }
        
        // Copy key buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                const button = e.target.closest('.copy-btn');
                const targetId = button.getAttribute('data-target');
                const target = document.getElementById(targetId);
                
                if (target) {
                    this.copyToClipboard(target.value);
                    this.showAlert('Key copied to clipboard!', 'success');
                    
                    // Update button text temporarily
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i> Copied';
                    button.classList.add('copied');
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('copied');
                    }, 2000);
                }
            }
        });
    }

    setupFileUpload() {
        const uploadAreas = document.querySelectorAll('.file-upload-area');
        
        uploadAreas.forEach(area => {
            const input = area.querySelector('input[type="file"]');
            
            // Click to select file
            area.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    input.click();
                }
            });
            
            // File selection
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0], area);
                }
            });
            
            // Drag and drop
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
                    this.handleFileSelect(file, area);
                    input.files = e.dataTransfer.files;
                }
            });
        });
    }

    handleFileSelect(file, area) {
        this.currentFile = file;
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showAlert('File size exceeds 100MB limit', 'error');
            return;
        }
        
        // Display file info
        this.displayFileInfo(file, area);
        this.showAlert('File selected successfully!', 'success');
    }

    displayFileInfo(file, area) {
        const fileSize = this.formatFileSize(file.size);
        const fileInfo = area.nextElementSibling || document.createElement('div');
        
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <i class="fas fa-file-check"></i>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    ${fileSize} • ${file.type || 'Unknown type'}
                </div>
            </div>
        `;
        
        if (!area.nextElementSibling) {
            area.parentNode.insertBefore(fileInfo, area.nextSibling);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupKeyValidation() {
        const keyInputs = document.querySelectorAll('.key-input');
        
        keyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const length = e.target.value.length;
                this.updateKeyLength(length);
                
                // Real-time validation
                if (length === 44) {
                    this.validateKey(e.target.value);
                }
            });
        });
    }

    updateKeyLength(length) {
        const lengthIndicator = document.getElementById('keyLength');
        if (lengthIndicator) {
            lengthIndicator.textContent = `${length}/44`;
            
            if (length === 44) {
                lengthIndicator.style.color = '#81c784'; // Success green
            } else if (length > 44) {
                lengthIndicator.style.color = '#e57373'; // Error red
            } else {
                lengthIndicator.style.color = 'var(--text-muted)';
            }
        }
    }

    async validateKey(key) {
        try {
            const response = await fetch('/api/validate_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: key })
            });
            
            const data = await response.json();
            if (data.valid) {
                this.showAlert('Valid key format', 'success');
            } else {
                this.showAlert(data.message || 'Invalid key', 'error');
            }
        } catch (error) {
            console.error('Key validation error:', error);
        }
    }

    async generateKey() {
        this.showLoading();
        
        try {
            const response = await fetch('/api/generate_key');
            const data = await response.json();
            
            if (data.success) {
                const keyInput = document.getElementById('encryptionKey') || 
                                document.getElementById('decryptionKey');
                
                if (keyInput) {
                    keyInput.value = data.key;
                    this.updateKeyLength(data.key.length);
                    
                    // Copy to clipboard
                    await this.copyToClipboard(data.key);
                    this.showAlert('Key generated and copied to clipboard!', 'success');
                    
                    // Focus on key input
                    keyInput.focus();
                    keyInput.select();
                }
            } else {
                this.showAlert(data.error || 'Failed to generate key', 'error');
            }
        } catch (error) {
            console.error('Key generation error:', error);
            this.showAlert('Failed to generate key. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleEncrypt(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const keyInput = form.querySelector('.key-input');
        const fileInput = form.querySelector('input[type="file"]');
        
        // Validate file
        if (!fileInput.files.length) {
            this.showAlert('Please select a file to encrypt', 'error');
            return;
        }
        
        // Validate key
        if (!keyInput.value.trim()) {
            this.showAlert('Please enter or generate an encryption key', 'error');
            return;
        }
        
        if (keyInput.value.length !== 44) {
            this.showAlert('Encryption key must be 44 characters', 'error');
            return;
        }
        
        this.showLoading();
        this.showProgress();
        
        try {
            // Request binary download directly to avoid any intermediate corruption
            const response = await fetch('/api/encrypt?download=1', {
                method: 'POST',
                body: formData
            });

            // If server returned JSON (error), parse and show
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                if (data.success) {
                    this.showAlert(data.message, 'success');
                    this.showDownloadSection(data);
                } else {
                    this.showAlert(data.error || 'Encryption failed', 'error');
                }
            } else if (response.ok) {
                // Treat as binary file
                const blob = await response.blob();
                // Get filename from content-disposition header if present
                const cd = response.headers.get('Content-Disposition') || '';
                let filename = 'encrypted_file.enc';
                const m = /filename\*=UTF-8''(.+)$/.exec(cd) || /filename="?([^";]+)"?/.exec(cd);
                if (m && m[1]) filename = decodeURIComponent(m[1]);

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                this.showAlert('File encrypted successfully', 'success');
                // Show a minimal download card
                this.showDownloadSection({ filename: filename, download_url: '/download/encrypted' });
            } else {
                this.showAlert('Encryption failed', 'error');
            }
        } catch (error) {
            console.error('Encryption error:', error);
            this.showAlert('An error occurred during encryption', 'error');
        } finally {
            this.hideLoading();
            this.hideProgress();
        }
    }

    async handleDecrypt(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const keyInput = form.querySelector('.key-input');
        const fileInput = form.querySelector('input[type="file"]');
        
        // Validate file
        if (!fileInput.files.length) {
            this.showAlert('Please select a file to decrypt', 'error');
            return;
        }
        
        // Validate key
        if (!keyInput.value.trim()) {
            this.showAlert('Please enter the decryption key', 'error');
            return;
        }
        
        if (keyInput.value.length !== 44) {
            this.showAlert('Decryption key must be 44 characters', 'error');
            return;
        }
        
        this.showLoading();
        this.showProgress();
        
        try {
            // Request binary download directly to avoid any intermediate corruption
            const response = await fetch('/api/decrypt?download=1', {
                method: 'POST',
                body: formData
            });

            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                if (data.success) {
                    this.showAlert(data.message, 'success');
                    this.showDownloadSection(data);
                } else {
                    this.showAlert(data.error || 'Decryption failed', 'error');
                }
            } else if (response.ok) {
                const blob = await response.blob();
                const cd = response.headers.get('Content-Disposition') || '';
                let filename = 'decrypted_file';
                const m = /filename\*=UTF-8''(.+)$/.exec(cd) || /filename="?([^";]+)"?/.exec(cd);
                if (m && m[1]) filename = decodeURIComponent(m[1]);

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                this.showAlert('File decrypted successfully', 'success');
                this.showDownloadSection({ filename: filename, download_url: '/download/decrypted' });
            } else {
                this.showAlert('Decryption failed', 'error');
            }
        } catch (error) {
            console.error('Decryption error:', error);
            this.showAlert('An error occurred during decryption', 'error');
        } finally {
            this.hideLoading();
            this.hideProgress();
        }
    }

    showDownloadSection(data) {
        const downloadSection = document.getElementById('downloadSection');
        const isEncrypt = data.download_url.includes('encrypted');
        
        downloadSection.innerHTML = `
            <div class="download-card slide-up">
                <div class="mb-4">
                    <i class="fas fa-${isEncrypt ? 'lock' : 'lock-open'} fa-3x" 
                       style="color: var(--accent-primary); margin-bottom: 1rem;"></i>
                    <h3 class="mb-2">File ${isEncrypt ? 'Encrypted' : 'Decrypted'} Successfully!</h3>
                    <p class="text-muted mb-0">Your file is ready to download</p>
                </div>
                
                <div class="file-info mb-4">
                    <i class="fas fa-file"></i>
                    <div class="file-details">
                        <div class="file-name">${data.filename}</div>
                        <div class="file-meta">Ready for download</div>
                    </div>
                </div>
                
                <div class="d-flex gap-3 justify-content-center">
                    <a href="${data.download_url}" class="btn btn-primary btn-lg" download>
                        <i class="fas fa-download me-2"></i>
                        Download ${isEncrypt ? 'Encrypted' : 'Decrypted'} File
                    </a>
                    <button type="button" class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-sync me-2"></i>
                        Process Another
                    </button>
                </div>
                
                <div class="mt-4 small text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    ${isEncrypt ? 
                        'Keep your encryption key safe! You will need it to decrypt this file.' :
                        'File successfully restored. Keep your encryption keys secure for future use.'
                    }
                </div>
            </div>
        `;
        
        downloadSection.style.display = 'block';
        downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => {
            alert.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => alert.remove(), 300);
        });
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} fade-in`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-triangle' : 
                              'info-circle'}"></i>
            <div>${message}</div>
            <button class="btn-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add custom close button style
        const style = document.createElement('style');
        style.textContent = `
            .alert .btn-close {
                background: none;
                border: none;
                color: inherit;
                opacity: 0.7;
                cursor: pointer;
                padding: 0.25rem;
                margin-left: auto;
            }
            .alert .btn-close:hover {
                opacity: 1;
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to container
        const container = document.querySelector('.glass-card') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 5000);
    }

    showProgress() {
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        if (progressContainer && progressFill && progressPercent) {
            progressContainer.style.display = 'block';
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                const width = Math.min(progress, 95);
                progressFill.style.width = `${width}%`;
                progressPercent.textContent = `${width}%`;
                
                if (progress >= 95) {
                    clearInterval(interval);
                }
            }, 50);
            
            window.progressInterval = interval;
        }
    }

    hideProgress() {
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        if (progressContainer && progressFill && progressPercent) {
            if (window.progressInterval) {
                clearInterval(window.progressInterval);
            }
            
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

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + E for encrypt page
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (!window.location.pathname.includes('/encrypt')) {
                    window.location.href = '/encrypt';
                }
            }
            
            // Ctrl/Cmd + D for decrypt page
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (!window.location.pathname.includes('/decrypt')) {
                    window.location.href = '/decrypt';
                }
            }
            
            // Ctrl/Cmd + G to generate key (on encrypt page)
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && 
                window.location.pathname.includes('/encrypt')) {
                e.preventDefault();
                this.generateKey();
            }
            
            // Escape to close alerts
            if (e.key === 'Escape') {
                document.querySelectorAll('.alert').forEach(alert => {
                    alert.style.animation = 'fadeOut 0.3s ease forwards';
                    setTimeout(() => alert.remove(), 300);
                });
            }
        });
    }

    initBackToTop() {
        const backToTop = document.createElement('button');
        backToTop.className = 'back-to-top';
        backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
        backToTop.title = 'Back to top';
        backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        
        document.body.appendChild(backToTop);
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.encryptor = new FileEncryptor();
    
    // Add page transition effect
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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
});

// Make helper functions available globally
window.generateKey = () => window.encryptor.generateKey();
window.showAlert = (message, type) => window.encryptor.showAlert(message, type);

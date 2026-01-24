from flask import Flask, render_template, request, send_file, session, jsonify
from cryptography.fernet import Fernet
import os
import base64
from werkzeug.utils import secure_filename
import tempfile
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_key():
    """Generate a Fernet key"""
    return Fernet.generate_key()

def is_valid_key(key_str):
    """Check if the key is a valid Fernet key"""
    try:
        # A valid Fernet key is 32 url-safe base64-encoded bytes
        if len(key_str) != 44:  # 32 bytes encoded to base64 = 44 characters
            return False
        # Try to decode it
        key = key_str.encode()
        Fernet(key)
        return True
    except:
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encrypt')
def encrypt_page():
    return render_template('encrypt.html')

@app.route('/decrypt')
def decrypt_page():
    return render_template('decrypt.html')

@app.route('/api/generate_key', methods=['GET'])
def api_generate_key():
    """Generate a new encryption key"""
    key = generate_key()
    return jsonify({
        'key': key.decode(),
        'message': 'Key generated successfully'
    })

@app.route('/api/encrypt', methods=['POST'])
def api_encrypt():
    """Encrypt a file"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get encryption key
        key_str = request.form.get('key', '').strip()
        if not key_str:
            return jsonify({'error': 'Encryption key is required'}), 400
        
        # Validate key
        if not is_valid_key(key_str):
            return jsonify({'error': 'Invalid encryption key. Key must be 32 URL-safe base64-encoded bytes'}), 400
        
        # Read file
        file_data = file.read()
        filename = secure_filename(file.filename)
        
        # Encrypt data
        key = key_str.encode()
        fernet = Fernet(key)
        encrypted_data = fernet.encrypt(file_data)
        
        # Save encrypted file to temp location
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.encrypted')
        temp_file.write(encrypted_data)
        temp_file.close()
        
        # Store file path in session
        session['encrypted_file'] = temp_file.name
        session['original_filename'] = filename + '.encrypted'
        
        return jsonify({
            'success': True,
            'message': 'File encrypted successfully',
            'filename': filename + '.encrypted'
        })
        
    except Exception as e:
        return jsonify({'error': f'Encryption failed: {str(e)}'}), 500

@app.route('/api/decrypt', methods=['POST'])
def api_decrypt():
    """Decrypt a file"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get decryption key
        key_str = request.form.get('key', '').strip()
        if not key_str:
            return jsonify({'error': 'Decryption key is required'}), 400
        
        # Validate key
        if not is_valid_key(key_str):
            return jsonify({'error': 'Invalid decryption key. Key must be 32 URL-safe base64-encoded bytes'}), 400
        
        # Read file
        file_data = file.read()
        filename = secure_filename(file.filename)
        
        # Decrypt data
        key = key_str.encode()
        fernet = Fernet(key)
        
        try:
            decrypted_data = fernet.decrypt(file_data)
        except:
            return jsonify({'error': 'Decryption failed. Invalid key or corrupted file.'}), 400
        
        # Save decrypted file to temp location
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file.write(decrypted_data)
        temp_file.close()
        
        # Store file path in session
        session['decrypted_file'] = temp_file.name
        
        # Try to restore original filename
        if filename.endswith('.encrypted'):
            original_name = filename[:-10]  # Remove .encrypted suffix
        else:
            original_name = 'decrypted_' + filename
        
        session['original_filename'] = original_name
        
        return jsonify({
            'success': True,
            'message': 'File decrypted successfully',
            'filename': original_name
        })
        
    except Exception as e:
        return jsonify({'error': f'Decryption failed: {str(e)}'}), 500

@app.route('/download/encrypted')
def download_encrypted():
    """Download encrypted file"""
    if 'encrypted_file' not in session or not os.path.exists(session['encrypted_file']):
        return "File not found", 404
    
    try:
        return send_file(
            session['encrypted_file'],
            as_attachment=True,
            download_name=session.get('original_filename', 'encrypted_file.encrypted')
        )
    finally:
        # Clean up temp file
        if os.path.exists(session['encrypted_file']):
            os.unlink(session['encrypted_file'])
        session.pop('encrypted_file', None)
        session.pop('original_filename', None)

@app.route('/download/decrypted')
def download_decrypted():
    """Download decrypted file"""
    if 'decrypted_file' not in session or not os.path.exists(session['decrypted_file']):
        return "File not found", 404
    
    try:
        return send_file(
            session['decrypted_file'],
            as_attachment=True,
            download_name=session.get('original_filename', 'decrypted_file')
        )
    finally:
        # Clean up temp file
        if os.path.exists(session['decrypted_file']):
            os.unlink(session['decrypted_file'])
        session.pop('decrypted_file', None)
        session.pop('original_filename', None)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

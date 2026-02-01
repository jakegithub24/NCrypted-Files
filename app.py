from flask import Flask, render_template, request, send_file, session, jsonify, send_from_directory
from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken
import os
import tempfile
import secrets
import base64
import hashlib
from werkzeug.utils import secure_filename
import mimetypes

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['ALLOWED_EXTENSIONS'] = {
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx',
    'mp4', 'mp3', 'zip', 'rar', 'ppt', 'pptx', 'csv', 'json', 'xml', 'html',
    'css', 'js', 'py', 'java', 'cpp', 'c', 'h', 'md'
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_key():
    """Generate a Fernet key"""
    return Fernet.generate_key()

def is_valid_key(key_str):
    """Check if the key is a valid Fernet key"""
    try:
        # Accept either str or bytes
        if isinstance(key_str, bytes):
            key_bytes = key_str
        else:
            key_bytes = key_str.encode('utf-8')

        # Decode using URL-safe base64 and ensure it decodes to 32 bytes
        decoded = base64.urlsafe_b64decode(key_bytes)
        if len(decoded) != 32:
            return False

        # Try to create a Fernet instance to perform final validation
        Fernet(key_bytes)
        return True
    except Exception:
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
    try:
        key = generate_key()
        return jsonify({
            'success': True,
            'key': key.decode('utf-8'),
            'message': 'Key generated successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to generate key: {str(e)}'}), 500

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
        
        # Get encryption key
        key_str = request.form.get('key', '').strip()
        if not key_str:
            return jsonify({'error': 'Encryption key is required'}), 400
        
        # Validate key
        if not is_valid_key(key_str):
            return jsonify({'error': 'Invalid encryption key. Key must be 44 URL-safe base64 characters'}), 400
        
        # Read file data
        file_data = file.read()
        original_filename = secure_filename(file.filename)
        
        # Encrypt data
        try:
            key = key_str.encode('utf-8')
            fernet = Fernet(key)
            encrypted_data = fernet.encrypt(file_data)
        except Exception as e:
            return jsonify({'error': f'Encryption failed: {str(e)}'}), 400
        
        # If client requested direct download, return the encrypted bytes as an attachment
        if request.args.get('download') == '1':
            from io import BytesIO
            fbuf = BytesIO(encrypted_data)
            download_name = f"{original_filename}.enc"
            return send_file(
                fbuf,
                as_attachment=True,
                download_name=download_name,
                mimetype='application/octet-stream'
            )

        # Save encrypted file to temp location for later session-based download
        temp_filename = f"encrypted_{secrets.token_hex(8)}_{original_filename}.enc"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(encrypted_data)
        
        # Compute diagnostics for later comparison (helpful if clients corrupt file)
        encrypted_hash = hashlib.sha256(encrypted_data).hexdigest()
        encrypted_size = len(encrypted_data)

        # Store in session for download
        session['encrypted_file_path'] = temp_path
        session['encrypted_filename'] = f"{original_filename}.enc"
        session['encrypted_file_hash'] = encrypted_hash
        session['encrypted_file_size'] = encrypted_size
        
        app.logger.debug(f"Encrypted file stored: path={temp_path} size={encrypted_size} sha256={encrypted_hash}")

        return jsonify({
            'success': True,
            'message': 'File encrypted successfully',
            'filename': f"{original_filename}.enc",
            'download_url': '/download/encrypted',
            # expose diagnostics when running in debug mode
            'diagnostics': app.debug and {'sha256': encrypted_hash, 'size': encrypted_size} or None
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
            return jsonify({'error': 'Invalid decryption key. Key must be 44 URL-safe base64 characters'}), 400
        
        # Read file data
        file_data = file.read()
        original_filename = secure_filename(file.filename)
        
        # Decrypt data
        try:
            key = key_str.encode('utf-8')
            fernet = Fernet(key)
            decrypted_data = fernet.decrypt(file_data)
        except InvalidToken:
            # Most common case: wrong key or corrupted token
            app.logger.debug('Invalid token during decrypt - possible wrong key or corrupted file')
            # Provide helpful message but avoid exposing sensitive details
            return jsonify({'error': 'Decryption failed: invalid token (wrong key or corrupted file)'}), 400
        except Exception as e:
            app.logger.exception('Unexpected error during decryption')
            return jsonify({'error': f'Decryption failed: {str(e)}'}), 400
        
        # Determine original filename
        if original_filename.endswith('.enc'):
            decrypted_filename = original_filename[:-4]  # Remove .enc
        else:
            decrypted_filename = f"decrypted_{original_filename}"
        
        # If client requested direct download, return the decrypted bytes as an attachment
        if request.args.get('download') == '1':
            from io import BytesIO
            fbuf = BytesIO(decrypted_data)
            download_name = decrypted_filename
            return send_file(
                fbuf,
                as_attachment=True,
                download_name=download_name,
                mimetype='application/octet-stream'
            )

        # Save decrypted file to temp location
        temp_filename = f"decrypted_{secrets.token_hex(8)}_{decrypted_filename}"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(decrypted_data)
        
        # Compute diagnostics for uploaded encrypted file
        uploaded_hash = hashlib.sha256(file_data).hexdigest()
        uploaded_size = len(file_data)

        # Store in session for download
        session['decrypted_file_path'] = temp_path
        session['decrypted_filename'] = decrypted_filename
        
        diagnostics = {'uploaded_sha256': uploaded_hash, 'uploaded_size': uploaded_size}
        if 'encrypted_file_hash' in session:
            diagnostics['original_sha256'] = session.get('encrypted_file_hash')
            diagnostics['original_size'] = session.get('encrypted_file_size')
            diagnostics['hash_match'] = (diagnostics['original_sha256'] == uploaded_hash)

        app.logger.debug(f"File decrypted: filename={decrypted_filename} uploaded_sha256={uploaded_hash} uploaded_size={uploaded_size} hash_match={diagnostics.get('hash_match')}")

        return jsonify({
            'success': True,
            'message': 'File decrypted successfully',
            'filename': decrypted_filename,
            'download_url': '/download/decrypted',
            'diagnostics': app.debug and diagnostics or None
        })
        
    except Exception as e:
        return jsonify({'error': f'Decryption failed: {str(e)}'}), 500

@app.route('/download/encrypted')
def download_encrypted():
    """Download encrypted file"""
    if 'encrypted_file_path' not in session:
        return "File not found or session expired", 404
    
    file_path = session['encrypted_file_path']
    filename = session.get('encrypted_filename', 'encrypted_file.enc')
    
    if not os.path.exists(file_path):
        return "File not found", 404
    
    try:
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/octet-stream'
        )
    finally:
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except:
            pass
        
        # Clear session
        session.pop('encrypted_file_path', None)
        session.pop('encrypted_filename', None)

@app.route('/download/decrypted')
def download_decrypted():
    """Download decrypted file"""
    if 'decrypted_file_path' not in session:
        return "File not found or session expired", 404
    
    file_path = session['decrypted_file_path']
    filename = session.get('decrypted_filename', 'decrypted_file')
    
    if not os.path.exists(file_path):
        return "File not found", 404
    
    # Try to guess mimetype
    mimetype, _ = mimetypes.guess_type(filename)
    if not mimetype:
        mimetype = 'application/octet-stream'
    
    try:
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        )
    finally:
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except:
            pass
        
        # Clear session
        session.pop('decrypted_file_path', None)
        session.pop('decrypted_filename', None)

@app.route('/api/validate_key', methods=['POST'])
def api_validate_key():
    """Validate a Fernet key"""
    data = request.get_json()
    key_str = data.get('key', '').strip()

    if not key_str:
        return jsonify({'valid': False, 'message': 'Key is required'})

    try:
        # Decode using URL-safe base64 and check decoded length
        decoded = base64.urlsafe_b64decode(key_str)
        if len(decoded) != 32:
            return jsonify({'valid': False, 'message': 'Invalid key length'})

        # Try to create Fernet instance
        Fernet(key_str.encode('utf-8'))
        return jsonify({'valid': True, 'message': 'Valid key'})
    except Exception:
        return jsonify({'valid': False, 'message': 'Invalid key format'})

if __name__ == '__main__':
    app.run(debug=True, port=5500)

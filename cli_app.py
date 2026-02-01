import tkinter as tk
from tkinter import filedialog, simpledialog, messagebox
from cryptography.fernet import Fernet
import os

class FileEncryptorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("File Encryptor/Decryptor")
        self.root.geometry("400x200")
        
        # Main buttons
        tk.Button(root, text="Encrypt File", width=20, command=self.encrypt_flow).pack(pady=20)
        tk.Button(root, text="Decrypt File", width=20, command=self.decrypt_flow).pack(pady=20)

    def encrypt_flow(self):
        # Ask for file to encrypt
        file_path = filedialog.askopenfilename(title="Select File to Encrypt")
        if not file_path:
            return

        # Ask user for key or generate new
        generate = messagebox.askyesno("Encryption Key", "Generate a new key?\nClick 'No' to enter an existing key.")
        if generate:
            key = Fernet.generate_key()
            messagebox.showinfo("New Key Generated", f"Save this key securely:\n{key.decode()}")
            # copy to clipboard
            self.root.clipboard_clear()
            self.root.clipboard_append(key.decode())
            messagebox.showinfo("Clipboard", "Key copied to clipboard.")
        else:
            key_str = simpledialog.askstring("Enter Key", "Paste your Fernet key:")
            if not key_str:
                return
            key = key_str.encode()

        # Encrypt
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            fernet = Fernet(key)
            encrypted = fernet.encrypt(data)

            # Save encrypted file
            save_path = filedialog.asksaveasfilename(
                title="Save Encrypted File",
                initialfile=os.path.basename(file_path) + ".encrypted"
            )
            if not save_path:
                return
            with open(save_path, 'wb') as f:
                f.write(encrypted)

            messagebox.showinfo("Success", f"File encrypted and saved to:\n{save_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Encryption failed:\n{str(e)}")

    def decrypt_flow(self):
        # Ask for file to decrypt
        file_path = filedialog.askopenfilename(title="Select Encrypted File")
        if not file_path:
            return

        # Ask for decryption key
        key_str = simpledialog.askstring("Enter Key", "Paste your Fernet key:")
        if not key_str:
            return
        key = key_str.encode()

        # Decrypt
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            fernet = Fernet(key)
            decrypted = fernet.decrypt(data)

            # Save decrypted file
            suggested = os.path.basename(file_path).replace('.encrypted', '')
            save_path = filedialog.asksaveasfilename(
                title="Save Decrypted File",
                initialfile=suggested
            )
            if not save_path:
                return
            with open(save_path, 'wb') as f:
                f.write(decrypted)

            messagebox.showinfo("Success", f"File decrypted and saved to:\n{save_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Decryption failed:\n{str(e)}")

if __name__ == '__main__':
    root = tk.Tk()
    app = FileEncryptorApp(root)
    root.mainloop()
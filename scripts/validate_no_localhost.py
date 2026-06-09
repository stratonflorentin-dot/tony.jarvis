import sys
import os
import subprocess

def check_for_localhost(file_path):
    forbidden = ['localhost', '127.0.0.1', '::1']
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read().lower()
            for word in forbidden:
                if word in content:
                    # Allow validation logic itself to contain the words
                    if 'islocalhost' in content or 'validate_environment' in content:
                        continue
                    return word
    except Exception:
        pass
    return None

def main():
    # Get staged files
    files = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines()
    
    violations = []
    for file in files:
        if not os.path.isfile(file):
            continue
            
        # Skip this script and configuration files that contain validation logic
        if 'validate_no_localhost.py' in file or 'vite.config.js' in file or 'dev_server.py' in file:
            continue
            
        word = check_for_localhost(file)
        if word:
            violations.append(f"File '{file}' contains prohibited loopback reference: '{word}'")
            
    if violations:
        print("\n" + "!"*60)
        print("   GIT PRE-COMMIT HOOK: SECURITY POLICY VIOLATION")
        print("!"*60)
        for v in violations:
            print(f" - {v}")
        print("\nLoopback addresses (localhost/127.0.0.1) are strictly prohibited.")
        print("Please use dynamic environment variables or proper hostnames.")
        print("!"*60 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()

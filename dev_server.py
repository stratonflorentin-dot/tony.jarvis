import http.server
import socketserver
import os
import sys
import json
import subprocess
import platform
import threading
import time
import urllib.request
import urllib.error
import urllib.parse
import re
import shutil
import webbrowser
import psutil
import traceback
from datetime import datetime

# Optional imports for media control
try:
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    from comtypes import CLSCTX_ALL
    from ctypes import cast, POINTER
    HAS_PYCAW = True
except ImportError:
    HAS_PYCAW = False

try:
    import pygame
    pygame.mixer.init()
    HAS_PYGAME = True
except ImportError:
    HAS_PYGAME = False

PORT = 5001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class SystemController:
    def __init__(self):
        self.task_log = []
        self.active_tasks = {}

    def log_task(self, task_name, status, details=""):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "task": task_name,
            "status": status,
            "details": details
        }
        self.task_log.append(entry)
        print(f"[SYSTEM LOG] {entry['timestamp']} - {task_name}: {status}")

    def manage_file(self, action, path, destination=None, content=None):
        try:
            if action == 'create':
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w') as f:
                    f.write(content or "")
                return True, f"File created at {path}"
            elif action == 'delete':
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                return True, f"Path {path} removed"
            elif action == 'move' or action == 'copy':
                if action == 'move':
                    shutil.move(path, destination)
                else:
                    if os.path.isdir(path):
                        shutil.copytree(path, destination)
                    else:
                        shutil.copy2(path, destination)
                return True, f"File {action}d to {destination}"
            return False, "Invalid file action"
        except Exception as e:
            return False, str(e)

    def manage_app(self, action, app_name):
        try:
            if action == 'launch':
                if platform.system() == "Windows":
                    subprocess.Popen(f'start "" "{app_name}"', shell=True)
                else:
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, app_name])
                return True, f"Launching {app_name}"
            elif action == 'close':
                if platform.system() == "Windows":
                    # Try with .exe and without
                    subprocess.run(f"taskkill /F /IM {app_name}.exe", shell=True)
                    subprocess.run(f"taskkill /F /IM {app_name}", shell=True)
                else:
                    subprocess.run(["pkill", app_name])
                return True, f"Terminating {app_name}"
            return False, "Invalid app action"
        except Exception as e:
            return False, str(e)

    def manage_productivity(self, category, action, params):
        try:
            if category == 'email':
                to = params.get('to', '')
                subject = params.get('subject', '')
                body = params.get('body', '')
                mail_url = f"mailto:{to}?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(body)}"
                webbrowser.open(mail_url)
                return True, "Email client opened"
            elif category == 'document':
                # Create a simple text/markdown document and open it
                filename = params.get('name', 'document.txt')
                content = params.get('content', '')
                path = os.path.join(os.path.expanduser("~"), "Documents", filename)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w') as f:
                    f.write(content)
                if platform.system() == "Windows":
                    subprocess.Popen(f'start "" "{path}"', shell=True)
                else:
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, path])
                return True, f"Document created and opened: {path}"
            return False, "Invalid productivity category"
        except Exception as e:
            return False, str(e)

system_ctrl = SystemController()

class MediaController:
    def __init__(self):
        self.queue = []
        self.current_index = -1
        self.is_playing = False
        self.volume = 50
        self.repeat_mode = 'off' # off, track, all
        self.shuffle = False
        self.current_track_info = {}

    def set_volume(self, level):
        level = max(0, min(100, level))
        self.volume = level
        if HAS_PYCAW and platform.system() == "Windows":
            try:
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                volume = cast(interface, POINTER(IAudioEndpointVolume))
                # Unmute if muted
                if volume.GetMute():
                    volume.SetMute(0, None)
                # level is 0.0 to 1.0
                volume.SetMasterVolumeLevelScalar(level / 100.0, None)
                return True
            except Exception as e:
                print(f"[MEDIA] Volume error: {e}")
        return False

    def get_volume(self):
        if HAS_PYCAW and platform.system() == "Windows":
            try:
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                volume = cast(interface, POINTER(IAudioEndpointVolume))
                return int(volume.GetMasterVolumeLevelScalar() * 100)
            except:
                pass
        return self.volume

    def play_local(self, path):
        if not HAS_PYGAME:
            return False, "Pygame not installed"
        
        # Resolve path - check absolute or relative to CWD
        full_path = path
        if not os.path.isabs(path):
            full_path = os.path.join(os.getcwd(), path)

        if not os.path.exists(full_path):
            # Try searching in common music directories
            music_dirs = [
                os.path.join(os.path.expanduser("~"), "Music"),
                DIRECTORY
            ]
            for d in music_dirs:
                test_path = os.path.join(d, path)
                if os.path.exists(test_path):
                    full_path = test_path
                    break
        
        if not os.path.exists(full_path):
            return False, f"File not found: {path}"

        try:
            pygame.mixer.music.load(full_path)
            pygame.mixer.music.play()
            self.is_playing = True
            self.current_track_info = {"title": os.path.basename(full_path), "source": "local", "path": full_path}
            return True, f"Playing {os.path.basename(full_path)}"
        except Exception as e:
            return False, str(e)

    def pause(self):
        if HAS_PYGAME:
            pygame.mixer.music.pause()
            self.is_playing = False
            return True
        return False

    def resume(self):
        if HAS_PYGAME:
            pygame.mixer.music.unpause()
            self.is_playing = True
            return True
        return False

media_ctrl = MediaController()

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # Normalize path by removing trailing slashes
        path = self.path.rstrip('/')
        if not path.startswith('/'):
            path = '/' + path

        if path == '/execute':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            command = data.get('command', '')
            
            print(f"[EXEC] Received local execution request: {command}")
            
            try:
                if command == 'sys_info':
                    info = {
                        "platform": platform.system(),
                        "release": platform.release(),
                        "processor": platform.processor(),
                        "cwd": os.getcwd(),
                        "python_version": sys.version,
                        "time": time.ctime(),
                        "cpu_count": psutil.cpu_count(),
                        "memory_total": psutil.virtual_memory().total
                    }
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": info}).encode())
                    return

                if command == 'metrics':
                    metrics = {
                        "cpu_percent": psutil.cpu_percent(interval=None),
                        "memory_percent": psutil.virtual_memory().percent,
                        "disk_usage": psutil.disk_usage('/').percent,
                        "boot_time": psutil.boot_time()
                    }
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": metrics}).encode())
                    return

                if command == 'logs':
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "logs": system_ctrl.task_log}).encode())
                    return

                if command.startswith('shell:'):
                    shell_cmd = command.replace('shell:', '').strip()
                    print(f"[SHELL] Executing: {shell_cmd}")
                    # Execute and capture output
                    result = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True, timeout=10)
                    output = result.stdout if result.stdout else result.stderr
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "output": output}).encode())
                    return

                if platform.system() == "Windows":
                    # Use 'start' to open files/apps based on association
                    subprocess.Popen(f'start "" "{command}"', shell=True)
                else:
                    # macOS/Linux equivalents
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, command])
                
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": f"Opening {command}, Boss."}).encode())
            except Exception as e:
                print(f"[ERROR] Execution failed: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        
        elif path == '/media':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            action = data.get('action', '')
            
            print(f"[MEDIA] Action: {action}")
            
            res = {"success": False}
            if action == 'set_volume':
                res["success"] = media_ctrl.set_volume(data.get('level', 50))
            elif action == 'get_volume':
                res["success"] = True
                res["level"] = media_ctrl.get_volume()
            elif action == 'play':
                path_to_play = data.get('path')
                if path_to_play:
                    success, msg = media_ctrl.play_local(path_to_play)
                    res["success"] = success
                    res["message"] = msg
                else:
                    res["success"] = media_ctrl.resume()
            elif action == 'pause':
                res["success"] = media_ctrl.pause()
            elif action == 'stop':
                if HAS_PYGAME:
                    pygame.mixer.music.stop()
                    res["success"] = True
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/proxy':
            # Proxy request to Groq API to avoid CORS/Network issues
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            groq_url = 'https://api.groq.com/openai/v1/chat/completions'
            
            # Extract authorization from request headers
            auth_header = self.headers.get('Authorization', '')
            
            # Use specific headers for Groq API
            groq_headers = {
                'Content-Type': 'application/json',
                'Authorization': auth_header,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            print(f"[PROXY] Forwarding request to Groq API...")
            
            try:
                # Use a proper context for SSL if needed, though default is usually fine
                req = urllib.request.Request(groq_url, data=post_data, headers=groq_headers, method='POST')
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_data = response.read()
                    self.send_response(response.getcode())
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(res_data)
                    print(f"[PROXY] Success: 200 OK")
            except urllib.error.HTTPError as e:
                err_body = e.read()
                print(f"[PROXY] Groq API error: {e.code} - {err_body.decode('utf-8', errors='ignore')}")
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_body)
            except Exception as e:
                print(f"[PROXY] Connection error: {str(e)}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": {"message": f"Bridge Connection Failed: {str(e)}"}}).encode())

        elif path == '/search_music':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            query = data.get('query', '')
            
            print(f"[SEARCH] Searching YouTube for: {query}")
            
            try:
                # Use a more specific search query for better results
                search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query + ' audio')}"
                req = urllib.request.Request(search_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
                with urllib.request.urlopen(req, timeout=15) as response:
                    html = response.read().decode('utf-8', errors='ignore')
                    
                    # SYSTEMATIC EXTRACTION: Try multiple patterns as YouTube HTML structure varies
                    patterns = [
                        r'"videoId":"([^"]+)"',
                        r'watch\?v=([a-zA-Z0-9_-]{11})',
                        r'\/vi\/([a-zA-Z0-9_-]{11})'
                    ]
                    
                    video_id = None
                    for pattern in patterns:
                        match = re.search(pattern, html)
                        if match:
                            video_id = match.group(1)
                            # Validate length (YouTube IDs are 11 chars)
                            if len(video_id) == 11:
                                break
                            else:
                                video_id = None
                    
                    if video_id:
                        print(f"[SEARCH] Success! Found Video ID: {video_id}")
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": True, "videoId": video_id}).encode())
                    else:
                        print("[SEARCH] Warning: No valid Video ID found in response.")
                        self.send_response(404)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": False, "error": {"message": "Neural scan returned no valid stream identifiers."}}).encode())
            except Exception as e:
                print(f"[SEARCH] Critical Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": {"message": f"Search Matrix Failure: {str(e)}"}}).encode())

        elif path == '/system':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            category = data.get('category', '')
            action = data.get('action', '')
            
            system_ctrl.log_task(f"{category}:{action}", "STARTED")
            
            res = {"success": False}
            if category == 'file':
                success, msg = system_ctrl.manage_file(
                    action, 
                    data.get('path'), 
                    data.get('destination'), 
                    data.get('content')
                )
                res = {"success": success, "message": msg}
            elif category == 'app':
                success, msg = system_ctrl.manage_app(action, data.get('app_name'))
                res = {"success": success, "message": msg}
            elif category == 'browser':
                try:
                    webbrowser.open(data.get('url', 'https://google.com'))
                    res = {"success": True, "message": "Browser command executed"}
                except Exception as e:
                    res = {"success": False, "error": {"message": str(e)}}
            elif category == 'productivity':
                # Fix: Passing 3 arguments to manage_productivity
                success, msg = system_ctrl.manage_productivity(action, None, data.get('params', {}))
                res = {"success": success, "message": msg}
            
            system_ctrl.log_task(f"{category}:{action}", "COMPLETED" if res["success"] else "FAILED", res.get("message") or res.get("error"))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        else:
            print(f"[404] Route not found: {self.path}")
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": {"message": f"Interface route '{self.path}' rejected request (Not Found)."}}).encode())

    def do_GET(self):
        if self.path == '/':
            self.path = '/jarvis_standalone.html'
        return super().do_GET()

if __name__ == "__main__":
    print("\n" + "="*50)
    print("   JARVIS NEURAL BRIDGE - CORE INITIALIZATION")
    print("="*50)
    print(f"HUD_PATH: {DIRECTORY}")
    print(f"PORT:     {PORT}")
    print(f"OS:       {platform.system()} {platform.release()}")
    print("-"*50)
    print("\n[Vercel / Hosted HUD Instructions]")
    print("If you are using the Vercel app (HTTPS), you have two options:")
    print("1. RECOMMENDED: Open the local HUD directly at:")
    print(f"   http://localhost:{PORT}")
    print("2. ADVANCED: Use a secure tunnel (like ngrok) for HTTPS access:")
    print(f"   Run: ngrok http {PORT}")
    print("   Then paste the 'https://...' URL into HUD Settings -> Bridge URL.")
    print("\n[STATUS] Neural bridge online and standing by...\n")

    try:
        with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[OFFLINE] Neural bridge deactivated. Goodnight, Boss.")
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")
        sys.exit(1)

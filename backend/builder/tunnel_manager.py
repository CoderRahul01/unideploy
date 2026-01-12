import subprocess
import shutil
import time
import os

class TunnelManager:
    """
    Manages Cloudflare Tunnels (cloudflared).
    Exposes local ports to the public internet using TryCloudflare (Free).
    """
    def __init__(self):
        self.binary = shutil.which("cloudflared")
        if not self.binary:
            print("[TunnelManager] 'cloudflared' binary NOT FOUND. Tunnels will not work.")
        else:
            print(f"[TunnelManager] Found cloudflared at: {self.binary}")
            
    def start_tunnel(self, local_port: int, project_id: str):
        """
        Starts a Quick Tunnel (TryCloudflare) for the given port.
        Returns the public URL.
        """
        if not self.binary: return None
        
        url_file = f"/tmp/unideploy_url_{project_id}.txt"
        log_file = f"/tmp/unideploy_tunnel_{project_id}.log"
        
        # Command: cloudflared tunnel --url http://localhost:PORT
        cmd = [
            self.binary, "tunnel", 
            "--url", f"http://localhost:{local_port}",
            "--metrics", "localhost:0" # Disable metrics server to avoid port collision
        ]
        
        try:
            print(f"[TunnelManager] Starting tunnel for port {local_port}...")
            # We run it in background
            with open(log_file, "w") as log_out:
                process = subprocess.Popen(
                    cmd, 
                    stderr=log_out, # Cloudflare outputs URL to stderr
                    stdout=log_out
                )
            
            # Wait for URL to appear in logs
            attempts = 0
            public_url = None
            
            while attempts < 20: # Wait 10 seconds
                if os.path.exists(log_file):
                    with open(log_file, "r") as f:
                        content = f.read()
                        # Look for lines like: https://<random>.trycloudflare.com
                        for line in content.splitlines():
                            if ".trycloudflare.com" in line and "https://" in line:
                                # Extract URL
                                parts = line.split()
                                for p in parts:
                                    if "https://" in p and ".trycloudflare.com" in p:
                                        public_url = p
                                        break
                if public_url: break
                time.sleep(0.5)
                attempts += 1
                
            if public_url:
                print(f"[TunnelManager] Tunnel Active: {public_url}")
                return {"process": process, "url": public_url}
            else:
                print("[TunnelManager] Failed to get URL from cloudflared logs.")
                process.terminate()
                return None

        except Exception as e:
            print(f"[TunnelManager] Failed to start tunnel: {e}")
            return None

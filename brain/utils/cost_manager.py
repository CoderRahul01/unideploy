import json
import os
from datetime import datetime

class CostManager:
    """
    Manages and estimates costs for UniDeploy.
    Tracks E2B sandbox time and AWS Control Plane uptime.
    Saves logs to local_storage/ (git-ignored).
    """
    
    # Pricing Constants (estimated)
    E2B_COST_PER_HOUR = 0.05  # $0.05 per hour for a basic sandbox
    AWS_T3_MEDIUM_COST_PER_HOUR = 0.0416  # ~$30/month
    
    def __init__(self, storage_dir="local_storage"):
        self.storage_dir = storage_dir
        self.logs_file = os.path.join(storage_dir, "cost_logs.json")
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)
        if not os.path.exists(self.logs_file):
            with open(self.logs_file, "w") as f:
                json.dump({"total_estimated_usd": 0.0, "events": []}, f)

    def log_sandbox_usage(self, sandbox_id, duration_seconds, tier="SEED"):
        """
        Logs an E2B sandbox session and calculates cost.
        """
        hours = duration_seconds / 3600
        cost = hours * self.E2B_COST_PER_HOUR
        
        # Adjust cost based on tier if needed
        if tier == "LAUNCH": cost *= 2
        if tier == "SCALE": cost *= 4
        
        self._update_logs({
            "type": "E2B_SANDBOX",
            "id": sandbox_id,
            "duration": duration_seconds,
            "tier": tier,
            "cost_usd": cost,
            "timestamp": datetime.now().isoformat()
        })
        return cost

    def estimate_monthly_aws(self):
        """
        Estimates AWS Control Plane cost based on 24/7 uptime.
        """
        monthly_cost = 24 * 30 * self.AWS_T3_MEDIUM_COST_PER_HOUR
        return round(monthly_cost, 2)

    def _update_logs(self, event):
        with open(self.logs_file, "r") as f:
            data = json.load(f)
        
        data["total_estimated_usd"] += event["cost_usd"]
        data["events"].append(event)
        
        # Keep only last 100 events to prevent file bloat
        if len(data["events"]) > 100:
            data["events"] = data["events"][-100:]
            
        with open(self.logs_file, "w") as f:
            json.dump(data, f, indent=2)

    def get_summary(self):
        with open(self.logs_file, "r") as f:
            return json.load(f)

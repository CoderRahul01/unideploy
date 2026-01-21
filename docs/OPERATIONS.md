# 🛠️ UniDeploy Operations Guide

This guide covers how to monitor and manage your UniDeploy production environment using the **Hybrid AWS + E2B + Vercel** architecture.

---

## 💰 1. Cost & Limit Management
We are optimized for the **E2B Hobby (Free)** tier and **AWS Free Tier ($100 credits)**.

### E2B Free Tier Constraints
- **Max Session**: 1 hour.
- **Concurrent Sandboxes**: 20 (Max).
- **Billing**: Per-second.
- **Action**: Check the **"System Pulse"** on your dashboard for live credit tracking.

### AWS EC2 Management
The platform control plane runs on a single EC2 instance. 
- **Start/Stop**: Use the AWS Console to toggle your instance.
- **Static IP**: Ensure you are using an **Elastic IP** so your Vercel frontend stays connected.

---

## 📊 2. Monitoring Commands (AWS EC2)

SSH into your AWS instance to run these commands:

### Service Health (PM2)
We use `PM2` to keep the backend services alive 24/7.
```bash
# View list of running services
pm2 list

# View live logs for the Brain API
pm2 logs unideploy-brain

# View live logs for the Gateway Socket
pm2 logs unideploy-gateway

# Restart all services
pm2 restart all
```

### Nginx (Reverse Proxy)
```bash
# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🏗️ 3. Frontend Management (Vercel)
The frontend is managed via the **Vercel Dashboard**.
- **Logs**: Check the "Logs" tab in Vercel for any frontend or Edge Function issues.
- **Environment Variables**: Update `NEXT_PUBLIC_API_URL` if your AWS endpoint changes.

---

## 🚑 4. Troubleshooting

### "Project Stuck in WAKING"
- **Cause**: E2B may be experiencing high latency or the `E2B_API_KEY` is invalid.
- **Fix**: Check `pm2 logs unideploy-brain` for any API connection errors.

### "Dashboard Shows Offline"
- **Cause**: The AWS instance is stopped or Nginx is down.
- **Fix**: Check your EC2 instance status and ensure Nginx is running (`sudo systemctl start nginx`).

### "GitHub Login Failed"
- **Cause**: GitHub OAuth secret is incorrect or the Callback URL doesn't match.
- **Fix**: Update your Firebase Auth settings with the correct GitHub App credentials.

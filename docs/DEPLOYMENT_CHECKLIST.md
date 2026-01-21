# 🚀 UniDeploy Production Deployment Checklist

Follow these steps to ship UniDeploy to the world.

---

## 💻 1. Frontend (Vercel)
**Goal**: Deploy the `web/` directory to Vercel for the best performance.

1. **Connect Repository**: Push your code to GitHub and link the `web/` folder in Vercel.
2. **Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
3. **Environment Variables**: Add these in the Vercel Dashboard:
   - `NEXT_PUBLIC_API_URL`: `http://your-aws-ip` (Keep it as HTTP if you don't have SSL yet).
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: `...`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: `...`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: `...`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: `...`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: `...`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`: `...`
4. **Deploy**: Hit "Deploy".

---

## 🧠 2. Backend (AWS EC2)
**Goal**: Deploy the Brain and Gateway on a stable Ubuntu EC2 instance.

1. **Provision EC2**:
   - Instance Type: `t3.medium` (Recommended) or `t2.medium`.
   - Security Group: Allow inbound traffic on **Port 80** and **Port 22 (SSH)**.
2. **Elastic IP**: Assign an Elastic IP to your instance so the URL never changes.
3. **Run Setup**:
   ```bash
   # SSH into your EC2
   curl -O https://raw.githubusercontent.com/CoderRahul01/unideploy/main/setup_ec2_prod.sh
   chmod +x setup_ec2_prod.sh
   ./setup_ec2_prod.sh
   ```
4. **Environment Variables**:
   Create `/home/ubuntu/unideploy/brain/.env` with:
   - `DATABASE_URL`: Your Supabase connection string.
   - `E2B_API_KEY`: `...`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: `/home/ubuntu/unideploy/brain/firebase_service_account.json`
   - `ALLOWED_ORIGINS`: `https://your-vercel-domain.vercel.app` (Crucial for security!)
   - `PLATFORM_MAX_SANDBOXES`: `20` (Hobby Limit)
5. **Restart Services**:
   ```bash
   pm2 restart all
   ```

---

## 🛡️ 3. Post-Deployment Security
- [ ] **Rotate Keys**: Ensure you've rotated your Supabase and Firebase keys.
- [ ] **SSL (Optional but Recommended)**: Use Certbot to add HTTPS to your AWS instance:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx
  ```
- [ ] **Rate Limiting**: Check `Nginx` logs to ensure no one is blooming your API.

---
**Status**: Ready to Launch. 🚢

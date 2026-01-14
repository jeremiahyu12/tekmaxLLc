# 🚀 Deploy TekMax to Render - Complete Guide

Step-by-step guide para i-deploy ang TekMax delivery management system sa Render.

## 📋 Prerequisites

1. ✅ GitHub repository: https://github.com/jeremiahyu12/tekmaxLLc
2. ✅ Render account (sign up at https://render.com - FREE)
3. ✅ PostgreSQL database (gagawin natin sa Render)

---

## 🗄️ Step 1: Create PostgreSQL Database

1. Pumunta sa [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Fill up:
   - **Name**: `tekmax-database`
   - **Database**: `tekmax`
   - **User**: `tekmax_user`
   - **Region**: `Oregon` (or pinakamalapit sa iyo)
   - **PostgreSQL Version**: `16` (or latest)
   - **Plan**: `Starter` (FREE for 90 days)
4. Click **"Create Database"**
5. ⚠️ **IMPORTANTE**: Copy ang **"Internal Database URL"** - kailangan mo ito later!

### Run Database Migrations

1. Sa Render dashboard, click ang database mo
2. Click **"Connect"** tab
3. Copy ang **"psql command"** o **"Connection string"**
4. I-run ang migration files:

**Option A: Using psql (recommended)**
```bash
# Connect to database
psql "postgresql://tekmax_user:password@dpg-xxxxx-a.oregon-postgres.render.com/tekmax"

# Then run migrations
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_add_integrations.sql
```

**Option B: Using Render Shell**
1. Sa Render dashboard, click ang database
2. Click **"Shell"** tab
3. I-paste ang SQL files one by one

**Option C: Using database/schema.sql**
```bash
psql $DATABASE_URL < database/schema.sql
```

---

## 🔧 Step 2: Deploy Backend API

1. Sa [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub:
   - Click **"Connect account"** kung first time
   - Select repository: **`jeremiahyu12/tekmaxLLc`**
   - Click **"Connect"**

4. Configure Backend Service:

   **Basic Settings:**
   ```
   Name: tekmax-backend
   Region: Oregon (same as database)
   Branch: main
   Root Directory: backend
   Environment: Node
   Build Command: npm install --include=dev && npm run build
   Start Command: npm start
   ```

   **Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV = production
   PORT = 3000
   DATABASE_URL = <paste Internal Database URL from Step 1>
   JWT_SECRET = <generate random secret - see below>
   FRONTEND_URL = https://tekmax-frontend.onrender.com
   USE_MOCK_DB = false
   ```

   **Generate JWT_SECRET:**
   ```bash
   # Run sa terminal:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy ang output at i-paste sa JWT_SECRET

5. Click **"Create Web Service"**

6. ⏳ Wait for deployment (5-10 minutes)

7. ✅ Test: `https://tekmax-backend.onrender.com/api/health`

---

## 🌐 Step 3: Deploy Frontend

### Option A: Static Site (Recommended - FREE)

1. Sa Render Dashboard
2. Click **"New +"** → **"Static Site"**
3. Connect repository: **`jeremiahyu12/tekmaxLLc`**
4. Configure:
   ```
   Name: tekmax-frontend
   Branch: main
   Root Directory: frontend/public
   Build Command: (leave empty)
   Publish Directory: frontend/public
   ```
5. Click **"Create Static Site"**

### Option B: Serve from Backend (Current Setup - Recommended)

The frontend is automatically served from the backend. No additional configuration needed!

---

## 🔗 Step 4: Update Frontend API URL

**If frontend is served from backend (current setup):**
- No changes needed! The frontend will automatically use the same domain as the backend.

**If using a separate static site:**
Update ang `frontend/public/app.js` para magamit ang production API:

```javascript
// Hanapin ang API_BASE_URL at i-update:
const API_BASE_URL = 'https://tekmax-backend.onrender.com';
```

---

## ✅ Step 5: Final Configuration

### Update Backend CORS

Make sure ang `backend/src/index.ts` ay naka-configure para sa frontend URL:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://tekmax-frontend.onrender.com',
  credentials: true,
}));
```

### Test Everything

1. **Backend Health**: https://tekmax-backend.onrender.com/api/health
2. **Frontend**: https://tekmax-backend.onrender.com (served from backend)
3. **Login**: Try mag-login sa frontend

---

## 🔐 Environment Variables Summary

### Backend (.env or Render Dashboard):
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=<64-character-random-string>
FRONTEND_URL=https://tekmax-frontend.onrender.com
USE_MOCK_DB=false
```

### Frontend (if using environment variables):
```env
REACT_APP_API_URL=https://tekmax-backend.onrender.com
```

---

## 🐛 Troubleshooting

### ❌ Backend won't start
- Check **Logs** sa Render dashboard
- Verify `npm run build` completes
- Check na may `dist/index.js` after build
- Verify lahat ng environment variables naka-set

### ❌ Database connection error
- Verify `DATABASE_URL` is correct
- Use **Internal Database URL** (not External) para sa same region
- Check database status sa Render dashboard
- Verify migrations are run

### ❌ Frontend can't connect to backend
- Check `FRONTEND_URL` sa backend matches frontend URL
- Verify CORS settings
- Check `API_BASE_URL` sa frontend code
- Check browser console for errors

### ❌ 404 errors
- Verify routes are correct
- Check static file paths
- Verify build completed successfully

---

## 📊 Monitoring & Logs

- **Logs**: View real-time logs sa Render dashboard
- **Metrics**: CPU, Memory, Request metrics
- **Alerts**: Set up alerts for downtime

---

## 💰 Pricing

### Free Tier:
- ✅ Web services (sleeps after 15 min inactivity)
- ✅ PostgreSQL (90 days free trial)
- ✅ Static sites (always free)

### Paid Plans:
- **Starter**: $7/month per service (always on, no sleep)
- **Standard**: $25/month (better performance)

---

## 🔄 Auto-Deployment

Render automatically deploys kapag nag-push ka sa `main` branch.

**Manual Deploy:**
1. Go to service sa Render dashboard
2. Click **"Manual Deploy"**
3. Select branch/commit

---

## 📝 Post-Deployment Checklist

- [ ] Database created and migrations run
- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and accessible
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] API URLs updated in frontend
- [ ] Test login functionality
- [ ] Test API endpoints

---

## 🎉 Success!

Kapag successful, makikita mo:
- ✅ Backend running: `https://tekmax-backend.onrender.com`
- ✅ Frontend running: `https://tekmax-backend.onrender.com` (served from backend)
- ✅ Database connected
- ✅ Can login and use the system

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Environment Variables Guide](https://render.com/docs/environment-variables)
- [Deploying Node.js Apps](https://render.com/docs/deploy-nodejs)

---

## 🆘 Need Help?

Kung may problema:
1. Check Render logs
2. Verify environment variables
3. Test database connection
4. Check CORS settings
5. Review error messages sa browser console

Good luck! 🚀

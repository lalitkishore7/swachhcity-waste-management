# 🌆 SwachhCity: AI-Powered Waste Management Solution

<div align="center">
  <img src="docs/logo.png" alt="SwachhCity Logo" width="200"/>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
  [![YOLOv8](https://img.shields.io/badge/YOLOv8-Custom_Trained-orange.svg)](https://github.com/ultralytics/ultralytics)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)

  **Making Cities Cleaner Through Smart Technology**
  
  [Report Bug](https://github.com/lalitkishore7/swachhcity-waste-management/issues) · [Request Feature](https://github.com/lalitkishore7/swachhcity-waste-management/issues)
</div>

---

## 📖 About The Project

SwachhCity is an intelligent waste management platform that leverages computer vision and machine learning to revolutionize urban cleanliness. Citizens can report garbage through image uploads, and the system uses a custom-trained YOLOv8 model to verify waste, assess severity, and automatically assign cleanup tasks to the nearest available municipal worker. Administrators get a real-time dashboard with live maps, analytics, and AI-powered hotspot predictions.

### 🎯 Key Features

- **🤖 AI-Powered Garbage Detection** — Custom YOLOv8 model detects and classifies waste (Glass, Metal, Paper, Plastic, Mixed) in uploaded images
- **📸 Instant AI Preview** — Real-time garbage detection overlay with bounding boxes before submitting a complaint
- **📊 Enhanced Severity Scoring** — Multi-factor scoring: `40% ML confidence + 35% location sensitivity + 25% item count`
- **🏥 Location-Aware Priority** — Queries OpenStreetMap for nearby hospitals, schools, temples, and markets to boost priority
- **📍 Auto-Assignment** — Nearest available worker automatically assigned using Haversine distance calculation
- **✅ ML-Verified Cleanup** — Workers upload proof photos; AI verifies the area is clean before marking as resolved
- **🗺️ Live Map & Heatmap** — Real-time Leaflet map with complaint markers and canvas-based heatmap overlay
- **📈 Analytics Dashboard** — 7-day trends, garbage type distribution, resolution times, and worker performance
- **🔥 Hotspot Prediction** — Grid-based clustering algorithm predicts high-risk garbage accumulation zones
- **📱 Multi-Panel Interface** — Separate portals for Citizens, Workers, and Admins with role-based routing
- **🔐 OTP Email Verification** — Secure signup with 6-digit OTP via Gmail SMTP
- **📷 EXIF Validation** — Rejects images older than 30 minutes to prevent re-uploads of stale photos
- **📡 Worker GPS Tracking** — Workers share live GPS every 2 minutes for real-time location monitoring

---

## 🏗️ Built With

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://reactjs.org/) | UI Framework |
| [Vite 7](https://vitejs.dev/) | Build Tool & Dev Server |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-First Styling |
| [React Router 7](https://reactrouter.com/) | Client-Side Routing |
| [Leaflet](https://leafletjs.com/) + [React Leaflet 5](https://react-leaflet.js.org/) | Interactive Maps & Heatmaps |
| [Recharts 3](https://recharts.org/) | Charts & Data Visualization |
| [Lucide React](https://lucide.dev/) | Icon Library |
| [Axios](https://axios-http.com/) | HTTP Client |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime Environment |
| [Express 5](https://expressjs.com/) | Web Framework |
| [MySQL](https://www.mysql.com/) | Relational Database |
| [mysql2](https://github.com/sidorares/node-mysql2) | MySQL Driver (Promise Pool) |
| [JWT](https://jwt.io/) | Token-Based Authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password Hashing |
| [Multer 2](https://github.com/expressjs/multer) | File Upload Handling |
| [Nodemailer](https://nodemailer.com/) | OTP Email Delivery (Gmail SMTP) |
| [exif-parser](https://github.com/bwindels/exif-parser) | Image Timestamp Validation |

### ML Service
| Technology | Purpose |
|---|---|
| [Python 3.8+](https://www.python.org/) | Programming Language |
| [Flask 2.3](https://flask.palletsprojects.com/) | API Framework |
| [YOLOv8 Nano](https://github.com/ultralytics/ultralytics) | Object Detection (Custom Trained) |
| [Pillow](https://pillow.readthedocs.io/) | Image Processing |
| [NumPy](https://numpy.org/) | Numerical Computation |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **Python** 3.8 or higher
- **MySQL Server** 8.0 or higher
- **Git**

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/lalitkishore7/swachhcity-waste-management.git
cd swachhcity-waste-management
```

#### 2. Setup the Database
```bash
cd backend

# Create the MySQL database
node create-db.js

# The schema.sql file contains all table definitions, triggers, and stored procedures.
# Import it into MySQL:
mysql -u root -p swachhcity_db < schema.sql

# Run migrations to add additional columns
node migrate.js
```

#### 3. Setup Backend
```bash
cd backend
npm install

# Create .env file with the following variables:
```
```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=swachhcity_db
MYSQL_PORT=3306
JWT_SECRET=your_jwt_secret_key
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```
```bash
# Start backend server (runs on port 5000)
node server.js
```

#### 4. Setup ML Service
```bash
cd ml-service
pip install -r requirements.txt

# The custom model (yolov8n-trash.pt) is included in the repo.
# If missing, download it:
python download_model.py

# Start Flask server (runs on port 5001)
python app.py
```

#### 5. Setup Frontend
```bash
cd frontend
npm install

# Start Vite dev server (runs on port 5173)
npm run dev
```

#### 6. Access the Application
Open your browser and navigate to `http://localhost:5173`

---

## 📁 Project Structure

```
swachhcity-waste-management/
│
├── frontend/                        # React 19 + Vite Frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx   # Admin command center (maps, analytics, reports, workers, hotspots)
│   │   │   ├── AnalyticsChart.jsx   # Recharts bar, pie & line chart components
│   │   │   ├── ComplaintForm.jsx    # Citizen complaint submission with AI preview
│   │   │   ├── HotspotMap.jsx      # Leaflet heatmap with canvas overlay
│   │   │   ├── MyReports.jsx       # Citizen's submitted complaints
│   │   │   ├── ProfilePage.jsx     # User profile editor
│   │   │   └── WorkerPanel.jsx     # Worker task panel with GPS & proof capture
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth state management
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Login + forgot password (3-step OTP flow)
│   │   │   └── SignupPage.jsx       # Registration + OTP verification
│   │   ├── App.jsx                  # Root component with role-based routing
│   │   ├── App.css                  # Global styles
│   │   ├── index.css                # Tailwind imports
│   │   └── main.jsx                 # React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/                         # Node.js + Express 5 Backend
│   ├── routes/
│   │   ├── users.js                 # Auth, profile, OTP, worker management
│   │   └── complaints.js           # CRUD, analytics, hotspots, ML integration
│   ├── middleware/
│   │   └── auth.js                  # JWT verification & role authorization
│   ├── server.js                    # Express app entry point (port 5000)
│   ├── database.js                  # MySQL connection pool
│   ├── schema.sql                   # Full DB schema (12 tables, triggers, procedures)
│   ├── create-db.js                 # Database creation script
│   ├── migrate.js                   # Column migration script
│   └── package.json
│
├── ml-service/                      # Python Flask ML Service
│   ├── app.py                       # Flask API (predict, analyze-preview, hotspot)
│   ├── download_model.py            # Auto-download trained model from GitHub
│   ├── evaluate_model.py            # Model evaluation (mAP, precision, recall)
│   ├── requirements.txt             # Python dependencies
│   ├── yolov8n-trash.pt             # Custom trained waste detection model (6 MB)
│   ├── yolov8n.pt                   # Base YOLOv8 Nano model
│   ├── yolov8n-cls.pt               # YOLOv8 classification model
│   ├── test_api.py                  # API integration tests
│   ├── test_model.py                # Model inference tests
│   ├── test_oiv7.py                 # Model class inspection
│   └── test_oiv7_image.py           # Image detection tests
│
├── docs/                            # Documentation & assets
├── .gitignore
├── LICENSE                          # MIT License
└── README.md
```

---

## 📊 System Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│    Frontend      │────────▶│    Backend       │────────▶│    MySQL     │
│  React 19 + Vite │◀────────│  Express 5       │◀────────│   Database   │
│   Port 5173      │         │   Port 5000      │         │   12 Tables  │
└──────────────────┘         └──────────────────┘         └──────────────┘
        │                           │
        │  Direct Preview           │  Detection + Hotspot
        │  (analyze-preview)        │  (predict, hotspot)
        ▼                           ▼
┌────────────────────────────────────────────┐
│            ML Service (Flask)              │
│  YOLOv8 Custom Model · Port 5001          │
│  5 Classes: Glass, Metal, Paper,          │
│             Plastic, Mixed Waste          │
└────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 ┌─────────────┐      ┌──────────────────┐
 │  Garbage     │      │  OpenStreetMap   │
 │  Detection   │      │  Overpass API    │
 │  & Severity  │      │  (Location       │
 └─────────────┘      │   Sensitivity)   │
                       └──────────────────┘
```

### Complaint Submission Flow
1. **Citizen** uploads image → Frontend shows instant AI preview with bounding boxes
2. **Frontend** calls ML Service `/analyze-preview` directly for real-time detection overlay
3. Citizen submits → **Backend** validates EXIF timestamp (must be within 30 minutes)
4. **Backend** calls ML Service `/predict` → rejects if no garbage detected
5. **Backend** queries OpenStreetMap Overpass API for nearby sensitive locations (hospitals, schools, temples)
6. **Backend** computes enhanced severity: `0.40 × ML + 0.35 × Location + 0.25 × Count`
7. **Backend** auto-assigns nearest available worker via Haversine distance
8. Complaint saved to MySQL with full ML detection details

### Cleanup Verification Flow
1. **Worker** captures proof photo of cleaned area
2. **Backend** sends proof to ML Service with `?check_clean=true`
3. If AI still detects garbage → cleanup rejected, worker must retry
4. If area is verified clean → complaint marked as **Completed**

---

## 🤖 ML Model Details

### Custom Trained Model — `yolov8n-trash.pt`

| Property | Value |
|---|---|
| **Architecture** | YOLOv8 Nano (Object Detection) |
| **Model Size** | ~6 MB |
| **Classes** | 5 — Glass, Metal, Paper, Plastic, Waste (Mixed) |
| **Confidence Threshold** | 0.15 |
| **Loading** | Lazy-loaded on first request |

### Severity Calculation (ML Side)
```
severity = 0.6 × max_confidence + 0.4 × count_factor
count_factor = min(1.0, detection_count / 5.0)
```

### Enhanced Severity (Backend Side)
```
final_severity = 0.40 × ML_score + 0.35 × location_sensitivity + 0.25 × count_factor
```

**Location Sensitivity** is computed by querying the OpenStreetMap Overpass API for nearby amenities within a 500m radius, with weighted scores for hospitals, schools, religious places, markets, and other public areas.

---

## 📱 API Documentation

### User Endpoints — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/send-otp` | — | Step 1: Validate inputs, send OTP email |
| `POST` | `/verify-otp` | — | Step 2: Verify OTP, create user, return JWT |
| `POST` | `/resend-otp` | — | Resend signup OTP |
| `POST` | `/forgot-password` | — | Send password reset OTP |
| `POST` | `/reset-password` | — | Verify reset OTP, update password |
| `POST` | `/login` | — | Login with email/password, returns JWT |
| `GET` | `/me` | ✅ | Get current user profile |
| `PUT` | `/profile` | ✅ | Update name, phone, or password |
| `GET` | `/workers` | Admin | List all workers with GPS & task counts |
| `PUT` | `/workers/:id/location` | ✅ | Worker updates their GPS position |
| `GET` | `/worker-tasks/:id` | ✅ | Get pending tasks for a worker |

### Complaint Endpoints — `/api/complaints`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | — | Submit complaint with image (triggers full ML pipeline) |
| `GET` | `/` | — | List all complaints with citizen/worker info |
| `GET` | `/me` | ✅ | Get current user's complaints |
| `GET` | `/analytics` | — | Dashboard stats: totals, daily breakdown, type distribution |
| `GET` | `/hotspots` | — | AI-predicted garbage hotspot zones |
| `PUT` | `/:id/assign` | — | Assign a worker to a complaint |
| `PUT` | `/:id/status` | — | Update status (with ML cleanup verification for "resolved") |

### ML Service Endpoints — Port `5001`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict` | Garbage detection. Use `?check_clean=true` for cleanup verification |
| `POST` | `/analyze-preview` | Same as predict, for client-side instant preview |
| `POST` | `/hotspot` | Grid-based hotspot prediction from historical data |

---

## 🗄️ Database Schema

The MySQL database contains **12 tables** with triggers and stored procedures:

| Table | Purpose |
|---|---|
| `users` | Citizens, workers, admins with roles and auth info |
| `user_locations` | Addresses with lat/lon, city, state, pincode |
| `workers` | Extended worker profile: assigned area (GeoJSON), GPS, task stats, rating |
| `complaints` | Core table with complaint number (`SWCH-YYYY-XXXXX`), ML results, status tracking, worker assignment |
| `ml_detection_details` | Full ML output: model version, processing time, detected objects (JSON) |
| `complaint_status_history` | Audit trail of all status transitions |
| `worker_assignments` | Assignment lifecycle timestamps and response/completion times |
| `notifications` | User notifications for status updates and alerts |
| `hotspot_predictions` | Predicted risk zones with scores and metadata |
| `dashboard_analytics` | Pre-computed daily metrics for fast dashboard loading |
| `system_settings` | Configurable key-value pairs (thresholds, distances, etc.) |
| `audit_logs` | Complete action audit trail with old/new values, IP, user agent |

**Auto-generated complaint numbers:** `SWCH-2026-00001` via MySQL trigger.

---

## 🎨 User Interface

### Role-Based Routing

| Route | Component | Access |
|---|---|---|
| `/login` | Login + Forgot Password (3-step OTP) | Public |
| `/signup` | Registration + OTP Verification | Public |
| `/` | Complaint Form (Citizens) | Authenticated |
| `/admin` | Admin Dashboard (5-tab command center) | Admin Only |
| `/worker` | Worker Panel (tasks, GPS, proof capture) | Worker Only |
| `/profile` | Profile Editor | All Roles |
| `/my-reports` | Submitted Complaints | Citizens |

### Admin Dashboard Tabs
1. **🗺️ Live Map** — Leaflet map with complaint markers + heatmap overlay
2. **📊 Analytics** — Bar charts (7-day trends), pie charts (garbage types), summary stats
3. **📋 Reports** — Filterable complaint list with SLA badges (overdue > 24h)
4. **👷 Workers** — Performance table with assigned/resolved counts and completion %
5. **🔥 Hotspots** — Predicted risk zones on map with risk score rankings

---

## 🧪 Testing

### Test ML Service
```bash
cd ml-service

# Test the prediction API with sample images
python test_api.py

# Test model inference directly
python test_model.py

# Evaluate model metrics (mAP, precision, recall)
python evaluate_model.py
```

### Test Images
Two test images are included at the project root:
- `test-trash.jpeg` — Image with garbage (for positive detection testing)
- `test-clean.jpeg` — Clean area image (for cleanup verification testing)

---

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Example |
|---|---|---|
| `MYSQL_HOST` | MySQL server hostname | `localhost` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | `your_password` |
| `MYSQL_DATABASE` | Database name | `swachhcity_db` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | Secret key for JWT signing | `your_secret_key` |
| `SMTP_EMAIL` | Gmail address for OTP emails | `you@gmail.com` |
| `SMTP_PASSWORD` | Gmail App Password (not account password) | `xxxx xxxx xxxx xxxx` |

> **Note:** For Gmail SMTP, you must enable 2-Factor Authentication and generate an [App Password](https://myaccount.google.com/apppasswords).

### Service Ports

| Service | Default Port |
|---|---|
| Frontend (Vite) | `5173` |
| Backend (Express) | `5000` |
| ML Service (Flask) | `5001` |

---

## 🗺️ Roadmap

- [x] Citizen complaint submission with image upload
- [x] YOLOv8 custom-trained garbage detection (5 classes)
- [x] Instant AI preview with bounding box overlay
- [x] EXIF timestamp validation (30-minute freshness)
- [x] Location sensitivity scoring via OpenStreetMap
- [x] Auto-assignment to nearest worker (Haversine)
- [x] ML-verified cleanup with proof photos
- [x] Admin dashboard with 5-tab interface
- [x] Analytics with daily trends and type distribution
- [x] AI-powered hotspot prediction
- [x] Worker GPS tracking (2-min intervals)
- [x] OTP-based email verification
- [x] Forgot password flow
- [x] CSV export of complaints
- [ ] Mobile app (React Native)
- [ ] SMS / WhatsApp notifications
- [ ] Real-time WebSocket updates
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Offline mode with sync
- [ ] Advanced analytics with ML trend insights

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Team

- **Lalit Kishor** — Team Lead & Full Stack Developer — [GitHub](https://github.com/lalitkishore7)

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

## 📧 Contact

**Project Link:** [https://github.com/lalitkishore7/swachhcity-waste-management](https://github.com/lalitkishore7/swachhcity-waste-management)

---

## 🙏 Acknowledgments

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) — Object detection framework
- [OpenStreetMap](https://www.openstreetmap.org/) — Maps, geocoding & location data
- [Leaflet](https://leafletjs.com/) — Interactive map library
- [Recharts](https://recharts.org/) — React charting library
- [Swachh Bharat Mission](https://swachhbharatmission.gov.in/) — Inspiration for the project

---

<div align="center">
  Made with ❤️ by Team SwachhCity
  
  ⭐ Star this repo if you find it helpful!
</div>

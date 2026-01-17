# 🌆 SwachhCity: AI-Powered Waste Management Solution

<div align="center">
  <img src="docs/logo.png" alt="SwachhCity Logo" width="200"/>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
  [![YOLOv8](https://img.shields.io/badge/YOLOv8-Latest-orange.svg)](https://github.com/ultralytics/ultralytics)

  **Making Cities Cleaner Through Smart Technology**
  
  [View Demo](https://swachhcity-demo.vercel.app) · [Report Bug](https://github.com/yourusername/swachhcity/issues) · [Request Feature](https://github.com/yourusername/swachhcity/issues)
</div>

---

## 📖 About The Project

SwachhCity is an intelligent waste management platform that leverages computer vision and machine learning to revolutionize urban cleanliness. The system enables citizens to report garbage through image uploads, uses AI to verify and assess severity, automatically assigns cleanup tasks to municipal workers, and provides real-time analytics through an administrative dashboard.

### 🎯 Key Features

- **🤖 AI-Powered Garbage Detection** - YOLOv8 model detects and classifies waste in uploaded images
- **📊 Priority Scoring System** - ML-based severity assessment combined with location importance
- **📍 Auto-Assignment** - Nearest available worker automatically assigned to complaints
- **🗺️ Real-Time Tracking** - Live map showing all complaints and worker locations
- **📈 Analytics Dashboard** - Comprehensive insights for municipal administrators
- **🔥 Hotspot Prediction** - ML model predicts areas likely to accumulate garbage
- **📱 Multi-Panel Interface** - Separate portals for citizens, workers, and admins
- **🔔 Smart Notifications** - Real-time updates on complaint status

---

## 🏗️ Built With

### Frontend
- [React.js](https://reactjs.org/) - UI Framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React Leaflet](https://react-leaflet.js.org/) - Interactive Maps
- [Recharts](https://recharts.org/) - Data Visualization
- [Axios](https://axios-http.com/) - API Communication

### Backend
- [Node.js](https://nodejs.org/) - Runtime Environment
- [Express.js](https://expressjs.com/) - Web Framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - ODM
- [JWT](https://jwt.io/) - Authentication
- [Cloudinary](https://cloudinary.com/) - Image Storage

### ML Service
- [Python 3.8+](https://www.python.org/) - Programming Language
- [FastAPI](https://fastapi.tiangolo.com/) - ML API Framework
- [YOLOv8](https://github.com/ultralytics/ultralytics) - Object Detection Model
- [OpenCV](https://opencv.org/) - Image Processing
- [Scikit-learn](https://scikit-learn.org/) - Hotspot Prediction

### Deployment
- [Vercel](https://vercel.com/) - Frontend Hosting
- [Render](https://render.com/) - Backend & ML Service
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Cloud Database

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (3.8 or higher)
- MongoDB (local or Atlas account)
- Git

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/swachhcity-waste-management.git
cd swachhcity-waste-management
```

#### 2. Setup Backend
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.

# Start backend server
npm run dev
```

#### 3. Setup Frontend
```bash
cd ../frontend
npm install

# Create .env file
cp .env.example .env
# Edit .env with backend API URL

# Start frontend development server
npm start
```

#### 4. Setup ML Service
```bash
cd ../ml-service
pip install -r requirements.txt

# Download trained model (or train your own)
# Place garbage_model.pt in ml-service/models/

# Start FastAPI server
uvicorn app:app --reload --port 8000
```

---

## 📁 Project Structure

```
swachhcity-waste-management/
│
├── frontend/                   # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API calls
│   │   ├── utils/             # Helper functions
│   │   └── App.jsx
│   └── package.json
│
├── backend/                    # Node.js Backend
│   ├── controllers/           # Request handlers
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   ├── middleware/            # Authentication, validation
│   ├── utils/                 # Helper functions
│   ├── server.js
│   └── package.json
│
├── ml-service/                 # Python ML Service
│   ├── models/                # Trained model files
│   ├── utils/                 # Image processing utilities
│   ├── app.py                 # FastAPI application
│   └── requirements.txt
│
├── docs/                       # Documentation
│   ├── screenshots/           # App screenshots
│   ├── architecture.png       # System architecture diagram
│   └── api-docs.md           # API documentation
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🎨 Screenshots

### User Dashboard
![User Dashboard](docs/screenshots/user-dashboard.png)

### Worker Panel
![Worker Panel](docs/screenshots/worker-panel.png)

### Admin Analytics
![Admin Analytics](docs/screenshots/admin-dashboard.png)

### Garbage Detection in Action
![ML Detection](docs/screenshots/ml-detection.png)

---

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/swachhcity
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ML_SERVICE_URL=http://localhost:8000
```

### Frontend Environment Variables (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

---

## 📊 System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│   Node.js    │─────▶│   MongoDB   │
│  Frontend   │◀─────│   Backend    │◀─────│   Database  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            │ HTTP Request
                            ▼
                     ┌──────────────┐
                     │   FastAPI    │
                     │  ML Service  │
                     │   (YOLOv8)   │
                     └──────────────┘
```

**Data Flow:**
1. User uploads image → Frontend
2. Image sent to Backend → Stored in Cloudinary
3. Backend calls ML Service with image URL
4. YOLOv8 detects garbage & returns results
5. Backend calculates priority & assigns worker
6. Real-time updates sent to all panels

---

## 🤖 ML Model Details

### Training Dataset
- **Source:** Roboflow Universe Garbage Detection Dataset
- **Images:** 1,750+ labeled images
- **Classes:** Plastic, Metal, Glass, Organic, E-waste, Mixed
- **Annotations:** Bounding boxes for object detection

### Model Performance
- **Architecture:** YOLOv8 Nano
- **Accuracy:** 87.3%
- **Inference Time:** ~50ms per image
- **Model Size:** 6.2 MB

### Training Configuration
```python
model.train(
    data='garbage_dataset/data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    patience=10
)
```

---

## 📱 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login user
GET    /api/auth/profile        # Get user profile
```

### Complaint Endpoints
```
POST   /api/complaints          # Create new complaint
GET    /api/complaints          # Get all complaints
GET    /api/complaints/:id      # Get complaint by ID
PUT    /api/complaints/:id      # Update complaint status
DELETE /api/complaints/:id      # Delete complaint
```

### Worker Endpoints
```
GET    /api/workers             # Get all workers
GET    /api/workers/:id         # Get worker details
PUT    /api/workers/:id/status  # Update availability
GET    /api/workers/:id/tasks   # Get assigned tasks
```

### Admin Endpoints
```
GET    /api/admin/dashboard     # Get dashboard stats
GET    /api/admin/analytics     # Get detailed analytics
GET    /api/admin/hotspots      # Get predicted hotspots
```

For detailed API documentation, see [API Docs](docs/api-docs.md)

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Test ML Service
```bash
cd ml-service
pytest tests/
```

---

## 🚀 Deployment

### Deploy Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Deploy Backend (Render)
1. Push code to GitHub
2. Connect repository to Render
3. Add environment variables
4. Deploy

### Deploy ML Service (Render)
1. Create new Web Service
2. Select Python environment
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

---

## 🗺️ Roadmap

- [x] Basic complaint submission
- [x] YOLOv8 garbage detection
- [x] Worker auto-assignment
- [x] Admin dashboard
- [ ] Mobile app (React Native)
- [ ] SMS notifications via Twilio
- [ ] WhatsApp integration
- [ ] Real-time chat support
- [ ] Offline mode
- [ ] Multi-language support
- [ ] Advanced analytics with ML insights

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

- **Lalit Kishor** - Team Lead & Full Stack Developer - [GitHub]~(https://github.com/yourusername)
- **Teammate 2** - Frontend Developer - [GitHub](https://github.com/teammate2)
- **Teammate 3** - ML Engineer - [GitHub](https://github.com/teammate3)
- **Teammate 4** - Backend Developer - [GitHub](https://github.com/teammate4)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact

Project Link: [https://github.com/yourusername/swachhcity-waste-management](https://github.com/yourusername/swachhcity-waste-management)

Email: yourname@example.com

---

## 🙏 Acknowledgments

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) - Object detection framework
- [Roboflow](https://roboflow.com/) - Dataset management
- [React Icons](https://react-icons.github.io/react-icons/) - Icon library
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Cloud database
- Swachh Bharat Mission - Inspiration for the project

---

<div align="center">
  Made with ❤️ by Team SwachhCity
  
  ⭐ Star this repo if you find it helpful!
</div>


# NexPharmAI

**AI-Powered Pharmaceutical Smart Manufacturing, Production Scheduling, Predictive Maintenance and Factory Optimization Platform**

---

## 🌟 Executive Summary

**NexPharmAI** is a unified smart-manufacturing platform engineered specifically for pharmaceutical manufacturing environments. It bridges real-time machine telemetry, predictive maintenance, unsupervised anomaly detection, production planning, constraint-based scheduling (via Google OR-Tools), automatic rescheduling upon machine degradation, raw material inventory verification, batch quality prediction, OEE analytics, and a contextual AI decision assistant into a singular, cohesive enterprise solution.

---

## 🏗️ System Architecture

```
                                  +-----------------------+
                                  |  Demand Forecasting   |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |  Production Planning  |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        |  Inventory Verification |                       |   Machine Availability  |
        +------------+------------+                       +------------+------------+
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        | Material Gating Check   |                       | Machine Health Scoring  |
        +------------+------------+                       +------------+------------+
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                               +-----------------------------+
                               |    Predictive Maintenance   |
                               |    + Anomaly Detection      |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |    AI Production Scheduler  |
                               |     (Google OR-Tools)       |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |     Production Execution    |
                               |     & Batch Tracking        |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |   Batch Quality Prediction  |
                               +--------------+--------------+
                                              |
                                              v
                               +-----------------------------+
                               |      OEE & Analytics        |
                               +--------------+--------------+
                                              |
                       [Trigger: Critical Degradation / Anomaly]
                                              |
                                              v
                               +-----------------------------+
                               |    Automatic Rescheduler    |
                               +-----------------------------+
```

---

## 💻 Technology Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL 16
- **Optimization**: Google OR-Tools (Constraint Programming & MIP)
- **Machine Learning**: Scikit-Learn, XGBoost, LightGBM, CatBoost, imbalanced-learn (SMOTE), Isolation Forest, Joblib
- **Frontend**: Next.js 14+ (App Router), React 19/18, TypeScript, Pure CSS (Dark Theme, Zero Tailwind)
- **Security**: JWT (OAuth2 Bearer), Passlib (bcrypt), Role-Based Access Control (ADMIN, PRODUCTION_MANAGER, MAINTENANCE_MANAGER, QUALITY_MANAGER, OPERATOR)
- **DevOps**: Docker, Docker Compose

---

## 📂 Monorepo Structure

```
NexPharmAI/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── main.py           # Application entrypoint
│   │   ├── core/             # Configuration, database engine, security
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── api/              # Versioned API routes
│   │   ├── services/         # Business logic layer
│   │   ├── repositories/     # Data access layer
│   │   ├── ai/               # ML & OR-Tools scheduling engines
│   │   └── utils/            # Logging and utilities
│   ├── tests/                # pytest test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Next.js pure CSS web application
│   ├── src/
│   │   ├── app/              # Routes & pages
│   │   ├── components/       # UI design system components
│   │   ├── lib/              # Centralized typed API client
│   │   └── types/            # TypeScript data contracts
│   ├── package.json
│   └── tsconfig.json
├── ml/                       # Machine Learning modules & training pipelines
│   ├── predictive_maintenance/
│   ├── anomaly_detection/
│   ├── quality_prediction/
│   ├── demand_forecasting/
│   └── models/               # Model artifacts & metadata
├── datasets/                 # Authentic datasets (e.g. AI4I 2020)
├── docs/                     # Technical documentation
├── docker-compose.yml        # Multi-container orchestration
├── PROJECT_PROGRESS.md       # Live implementation ledger
└── README.md
```

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 15+ (or run via Docker Compose)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000`.

### 4. Docker Compose
```bash
docker compose up --build
```
=======
# NexPharmAI-2.0
AI-Powered Pharmaceutical Smart Manufacturing and Factory Optimization Platform

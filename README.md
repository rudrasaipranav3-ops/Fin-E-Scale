# Fin E-Scale

## AI-Powered E-Commerce Sales Forecasting and Customer Analytics

Fin E-Scale is a full-stack e-commerce analytics and decision-support platform that combines transactional analytics, customer intelligence, machine learning, sales forecasting, explainability, and notification-driven business insights in a unified dashboard.

The system is organized into three services:

- **Frontend** — Next.js, React, TypeScript, Tailwind CSS, Recharts, Three.js
- **Backend** — Node.js, Express.js, Prisma, PostgreSQL, Nodemailer
- **ML Service** — Python, FastAPI, Pandas, NumPy, and the machine-learning dependencies defined in `requirements.txt`

---

## Table of Contents

- [Overview](#overview)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Application Modules](#application-modules)
- [Sales Forecasting](#sales-forecasting)
- [Forecast Intelligence Pipeline](#forecast-intelligence-pipeline)
- [Notification System](#notification-system)
- [Authentication](#authentication)
- [Database](#database)
- [API Overview](#api-overview)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Testing and Validation](#testing-and-validation)
- [Responsive Design](#responsive-design)
- [Security and Environment Configuration](#security-and-environment-configuration)
- [Known Non-Blocking Warning](#known-non-blocking-warning)
- [Deployment Preparation](#deployment-preparation)
- [Future Scope](#future-scope)
- [Limitations](#limitations)
- [Project Status](#project-status)

---

## Overview

E-commerce applications generate large volumes of customer, product, order, and revenue data. Turning this data into useful business decisions requires more than conventional historical reporting.

Fin E-Scale provides an integrated platform for:

- Sales performance analysis
- Customer segmentation
- Customer churn analysis
- Customer Lifetime Value (CLV)
- Market basket analysis
- Product recommendations
- Sales forecasting
- Forecast explainability
- Business insights
- Risk alerts
- Automated notifications
- Interactive decision-support dashboards

The platform follows a data-to-decision workflow:

```text
E-Commerce Data
      |
      v
Data & Business Analytics
      |
      +-----------------------------+
      |                             |
      v                             v
Customer Intelligence        Sales Forecasting
      |                             |
      |                       V4.1 Forecast
      |                             |
      |                       Explainability
      |                             |
      |                    Business Interpretation
      |                             |
      +-------------+---------------+
                    |
                    v
        Recommendations / Risk Alerts
                    |
                    v
              Notifications
                    |
                    v
        Decision-Support Dashboard
```

---

## Objectives

The primary objectives of SmartSales AI are to:

1. Analyze historical e-commerce transaction data.
2. Provide an interactive business intelligence dashboard.
3. Identify meaningful customer segments.
4. Analyze potential customer churn.
5. Estimate Customer Lifetime Value.
6. Discover product purchasing relationships.
7. Generate product recommendations.
8. Forecast future sales using the validated V4.1 forecasting pipeline.
9. Provide interpretable forecast information.
10. Generate business-oriented insights and risk alerts.
11. Deliver important analytical events through notifications.
12. Provide a centralized interface for data-driven business decision support.

---

# Key Features

## 1. Authentication

The application provides authenticated access to the analytics platform.

Implemented functionality includes:

- User login
- Session verification
- Protected dashboard access
- Password reset
- Email OTP generation
- OTP verification
- Password reset after successful OTP verification

---

## 2. Business Intelligence Dashboard

The dashboard provides a centralized view of e-commerce performance.

It includes:

- KPI and summary information
- Revenue analysis
- Order analysis
- Product performance
- Recent orders
- Customer analytics
- Interactive charts
- Forecasting
- Recommendations
- Business insights
- Risk alerts
- Notifications

The dashboard has been validated across desktop, tablet, and mobile viewport sizes.

---

## 3. Customer Segmentation

Customer segmentation analyzes purchasing behavior and groups customers into meaningful segments.

The results can support:

- Customer targeting
- Marketing segmentation
- Retention strategies
- Personalized engagement

---

## 4. Churn Analysis

The churn module identifies customers who may be at risk of becoming inactive.

Potential business applications include:

- Retention campaigns
- Re-engagement strategies
- Customer relationship management
- Targeted offers

---

## 5. Customer Lifetime Value

The CLV module provides an estimate of the long-term economic value associated with customers.

This can help businesses:

- Prioritize valuable customers
- Support retention decisions
- Compare customer value
- Guide marketing allocation

---

## 6. Market Basket Analysis

Market basket analysis identifies relationships between products purchased together.

These relationships can support:

- Cross-selling
- Product bundling
- Promotional planning
- Store merchandising
- Recommendation strategies

---

## 7. Product Recommendations

The recommendation module provides product recommendation functionality based on the analytical/ML pipeline.

Recommendations can support:

- Cross-selling
- Upselling
- Product discovery
- Personalized shopping experiences

---

# Architecture

Fin E-Scale uses a three-service architecture.

```text
                         SmartSales AI
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
        Next.js            Express           FastAPI
        Frontend           Backend          ML Service
             |                |                |
             |                v                |
             |            Prisma ORM           |
             |                |                |
             |                v                |
             |           PostgreSQL            |
             |                                 |
             +---------------+-----------------+
                             |
                             v
                    Analytics & ML Results
```

### Frontend

Responsible for:

- User interface
- Authentication screens
- Dashboard rendering
- Charts and visualizations
- Forecast presentation
- Business insights
- Recommendations
- Risk alerts
- Notification interface
- Responsive behavior

### Backend

Responsible for:

- Authentication
- API routing
- Database access
- Analytics orchestration
- Dataset management
- Forecast orchestration
- Forecast intelligence
- Notification management
- Email/OTP functionality

### ML Service

Responsible for machine-learning and analytical operations exposed through FastAPI APIs, including the project's customer analytics and forecasting capabilities.

---

# Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js 16.2.12 | React application framework |
| React | UI development |
| TypeScript | Type-safe frontend development |
| Tailwind CSS | Styling and responsive UI |
| Recharts | Data visualization |
| Three.js | 3D/visual effects |
| React Three Fiber | Three.js integration with React |
| React Three Drei | Three.js helper components |

Installed Three.js-related versions validated in the project:

```text
@react-three/drei   10.7.7
@react-three/fiber   9.7.0
three                0.185.1
```

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API framework |
| Prisma | ORM/database access |
| PostgreSQL | Relational database |
| Nodemailer | Email/SMTP functionality |

## ML Service

| Technology | Purpose |
|---|---|
| Python | ML service runtime |
| FastAPI | ML API framework |
| Pandas | Data processing |
| NumPy | Numerical processing |
| `requirements.txt` | Python dependency definition |

---

# Project Structure

```text
Fin E-Scale/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── ...
│   │
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── analytics.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── dataset.controller.js
│   │   │   ├── notification.controller.js
│   │   │   └── recommendation.controller.js
│   │   │
│   │   ├── routes/
│   │   │   ├── analytics.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── dataset.routes.js
│   │   │   └── notification.routes.js
│   │   │
│   │   ├── services/
│   │   │   ├── analytics.service.js
│   │   │   ├── dataset-quality.service.js
│   │   │   ├── forecastExplainability.service.js
│   │   │   ├── forecastInsights.service.js
│   │   │   └── notification.service.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── upload.middleware.js
│   │   │
│   │   ├── lib/
│   │   │   ├── email.js
│   │   │   └── prisma.js
│   │   │
│   │   ├── utils/
│   │   │   └── forecast.utils.js
│   │   │
│   │   └── server.js
│   │
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── explore/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   ├── dataset/
│   │   │   ├── forecast/
│   │   │   ├── notifications/
│   │   │   └── ui/
│   │   │
│   │   ├── lib/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── .env.local
│
├── ml-service/
│   ├── app/
│   │   ├── api/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── __init__.py
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .gitignore
│
└── README.md
```

---

# Application Modules

The dashboard provides the following major analytics areas:

```text
Overview
Segmentation
Churn
CLV
Basket Analysis
Recommendations
Forecasting
```

The notification system is available through the dashboard header notification control.

---

# Sales Forecasting

Sales forecasting is a core Fin E-Scale capability.

The validated forecasting model/pipeline is identified as:

```text
sales-forecast-v4.1
```

The forecasting endpoint accepts a forecast horizon and processes completed order history before requesting predictions from the ML service.

The system supports configurable forecast horizons, including the validated 30-day forecasting workflow.

## Forecasting Flow

```text
Completed Order History
          |
          v
Historical Data Preparation
          |
          v
Historical Coverage Validation
          |
          v
V4.1 Forecast Request
          |
          v
ML Service Prediction
          |
          v
Forecast Validation
          |
          v
Forecast Persistence
          |
          v
Business Insights
          |
          v
Recommendations / Risk Alerts
          |
          v
Forecast Explainability
          |
          v
Notifications
```

The V4.1 pipeline is considered frozen for the final project. No V4.2 model or additional model tuning is part of the validated implementation.

---

# Forecast Intelligence Pipeline

Fin E-Scale extends the forecast output into business-oriented intelligence.

```text
Forecast
   |
   +--> Model Comparison
   |
   +--> Business Insights
   |
   +--> Recommendations
   |
   +--> Risk Alerts
   |
   +--> Explainability
   |
   +--> Notifications
```

This architecture separates numerical prediction from interpretation and decision support.

The frontend contains dedicated components for:

```text
ForecastSummaryCards
RevenueForecastChart
ForecastTable
ForecastTrendCards
ModelComparisonCard
BusinessInsightsPanel
AIRecommendations
RiskAlerts
ForecastExplainability
```

---

# Notification System

The notification system converts important analytical events into user-facing notifications.

## Supported Operations

- Retrieve notifications
- Display unread count
- Mark an individual notification as read
- Mark all notifications as read
- Delete notifications
- Refresh notifications
- Display notification priority
- Associate notifications with dates and metrics

## Notification Sources

Notifications can be generated from forecast intelligence including:

- Risk alerts
- Actionable recommendations
- Forecast conditions
- Forecast explainability signals

## Concurrency-Safe Deduplication

The backend notification service uses a deterministic deduplication key and PostgreSQL transaction-level advisory locking to prevent duplicate notifications during concurrent operations.

Validated concurrency test:

```text
Concurrent calls: 2
Total created: 1
Total skipped: 1
Matching DB notifications: 1

CONCURRENCY DEDUPLICATION PASSED
```

This ensures concurrent forecast processing does not create multiple identical notification records.

---

# Authentication

The application uses authenticated API access and session verification.

Authentication functionality includes:

- Login
- Session verification
- Protected dashboard access
- Password reset
- Six-digit OTP generation
- OTP verification
- Password reset after successful verification

Password reset OTPs are stored as hashed values and have a limited validity period.

Protected notification operations also verify ownership before modifying records.

---

# Database

Fin E-Scale uses PostgreSQL as its relational database and Prisma as the ORM.

The backend is responsible for database access.

The database supports application data including:

- Users
- Orders
- Order items
- Products
- Datasets
- Forecasts
- Notifications
- Password-reset OTP records

The exact schema is maintained in:

```text
backend/prisma/schema.prisma
```

---

# API Overview

The backend exposes API groups for the application's major services.

```text
/api/auth
/api/datasets
/api/dashboard
/api/analytics
/api/notifications
```

## Health Endpoint

```http
GET /api/health
```

A successful development response includes:

```json
{
  "success": true,
  "status": "OK",
  "server": "online",
  "database": "PostgreSQL",
  "databaseStatus": "connected"
}
```

## Forecast Endpoint

The forecasting workflow is exposed under:

```text
POST /api/analytics/forecasting/run
```

The request accepts a forecast horizon.

Example:

```json
{
  "horizon": 30
}
```

The endpoint is authenticated and uses completed order history as the basis for the forecast workflow.

---

# Prerequisites

Install the following before running SmartSales AI:

- Node.js
- npm
- Python
- PostgreSQL

Recommended development environment:

```text
Frontend  -> localhost:3000
Backend   -> localhost:5001
Database  -> localhost:5432
ML Service -> configured FastAPI port
```

---

# Installation and Setup

## 1. Clone or copy the project

Place the project in a working directory.

Example:

```text
Fin E-Scale/
├── backend/
├── frontend/
└── ml-service/
```

---

## 2. Backend

```powershell
cd backend
npm install
```

Configure:

```text
backend/.env
```

Do not commit this file.

Generate Prisma Client:

```powershell
npx prisma generate
```

For database synchronization during development:

```powershell
npx prisma migrate dev
```

or, where appropriate:

```powershell
npx prisma db push
```

Start the backend:

```powershell
npm run dev
```

Expected development API:

```text
http://localhost:5001
```

Health endpoint:

```text
http://localhost:5001/api/health
```

---

# Frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

Configure local environment variables in:

```text
frontend/.env.local
```

Do not commit this file.

Start the frontend:

```powershell
npm run dev
```

Expected development URL:

```text
http://localhost:3000
```

---

# ML Service

Open another terminal:

```powershell
cd ml-service
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Start the FastAPI application using the project's configured entry point.

The ML service must be reachable by the backend using the configured environment settings.

---

# Running the Application

The complete development environment consists of three services:

```text
+--------------------+
| Next.js Frontend   |
| localhost:3000     |
+---------+----------+
          |
          v
+--------------------+
| Express Backend    |
| localhost:5001     |
+---------+----------+
          |
          +------------------+
          |                  |
          v                  v
+----------------+   +--------------------+
| PostgreSQL     |   | FastAPI ML Service |
| localhost:5432 |   | configured port    |
+----------------+   +--------------------+
```

Start all three services and then open:

```text
http://localhost:3000
```

---

# Testing and Validation

Fin E-Scale has undergone functional, responsive, integration, and technical validation.

## TypeScript Validation

Command:

```powershell
npx tsc --noEmit
```

Result:

```text
PASSED
```

---

## Production Build

Command:

```powershell
npm run build
```

The final validated build completed successfully with:

```text
Compiled successfully
Finished TypeScript
Collecting page data
Generating static pages (7/7)
Finalizing page optimization
```

Validated routes include:

```text
/
/_not-found
/auth
/dashboard
/explore
```

---

## Backend Health Validation

Command:

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:5001/api/health" `
  -Method GET `
  -UseBasicParsing
```

Validated result:

```text
HTTP 200 OK
Server: online
PostgreSQL: connected
```

---

## Forecast End-to-End Validation

The forecast workflow was successfully tested end-to-end.

Validated output included:

```text
Model: sales-forecast-v4.1
Forecast points: 30
Business insights: generated
Model comparison: generated
Forecast explainability: generated
Recommendations: generated
Risk alerts: generated
Notifications: generated
```

---

## Notification Validation

Notification functionality was validated for:

- Retrieval
- Unread count
- Marking notifications as read
- Marking all as read
- Deletion
- Forecast-triggered generation
- Deduplication

Concurrency testing confirmed:

```text
2 concurrent requests
1 notification created
1 duplicate skipped
1 matching database notification
```

---

## Responsive Validation

The dashboard was tested at:

```text
320px
375px
417px
768px
1024px
1280px
1440px
```

Validated responsive behavior includes:

- Mobile navigation drawer
- Responsive header
- Mobile content width
- Responsive typography
- Horizontal table scrolling
- Product Performance table accessibility
- Recent Orders table accessibility
- Desktop sidebar behavior
- Tablet layout
- Large-screen dashboard layout

---

# Security and Environment Configuration

Environment-specific credentials must not be committed to source control.

Protected files include:

```text
backend/.env
frontend/.env.local
```

The backend `.gitignore` protects environment files and uploaded content.

The frontend `.gitignore` protects environment files and Next.js/build artifacts.

The ML service `.gitignore` protects:

- `.venv`
- `__pycache__`
- Python cache files
- Environment files
- Test/coverage artifacts
- IDE files

Before public deployment:

- Rotate development credentials that may have been exposed.
- Use production secrets stored in the deployment platform.
- Enable HTTPS.
- Configure secure authentication cookies.
- Restrict CORS to trusted origins.
- Use a production PostgreSQL database.
- Never expose database or SMTP credentials to the frontend.

---

# Known Non-Blocking Warning

During development, a Three.js `THREE.Clock` deprecation warning was observed.

The application source does not explicitly instantiate:

```javascript
new THREE.Clock()
```

The particle component uses React Three Fiber's supplied clock:

```typescript
state.clock.elapsedTime
```

The warning does not prevent:

- TypeScript compilation
- Production builds
- Dashboard operation
- Forecast execution
- Notification functionality
- Responsive behavior

The currently validated Three.js / React Three Fiber versions have therefore been retained rather than introducing an unnecessary dependency change late in the project lifecycle.

---

# Project Cleanup

The final source tree has been cleaned of temporary development artifacts.

Completed cleanup includes:

- Removal of temporary forecast console logging
- Archiving of historical dashboard versions
- Removal of generated Python `__pycache__` directories
- Addition of ML-service `.gitignore`
- Protection of backend environment files
- Protection of frontend environment files
- Removal of obsolete backup files from active source directories

Historical recovery files are retained outside active source directories where appropriate.

---

# Deployment Preparation

Before deploying to production, configure the following:

## Frontend

- Production backend API URL
- Production environment variables
- Secure HTTPS deployment
- Production build

## Backend

- Production PostgreSQL connection
- Production ML-service URL
- CORS configuration
- Authentication cookie configuration
- JWT/session configuration
- SMTP configuration
- Production environment variables

## ML Service

- Python runtime
- Required dependencies
- Production API host/port
- Production environment variables where required

## Database

- Production PostgreSQL instance
- Database migrations
- Secure credentials
- Backup strategy

After production configuration, run:

```powershell
npm run build
```

and perform a complete smoke test against the production services.

---

# Future Scope

Potential future enhancements include:

- Larger and more representative forecast evaluation datasets
- Automated model monitoring
- Automated model retraining
- Advanced anomaly detection
- Real-time sales event processing
- More granular customer personalization
- Advanced recommendation strategies
- Scheduled business reports
- Role-based enterprise access control
- Cloud-native scaling
- Additional business intelligence metrics

These are future enhancements and are not part of the frozen V4.1 implementation.

---

# Limitations

Forecast evaluation quality depends on the availability, completeness, and coverage of historical sales data.

When evaluation data is limited, forecast confidence should be interpreted cautiously.

The current project should therefore be evaluated using sufficiently large and representative historical datasets before being used for high-stakes production forecasting decisions.

---

# Project Status

## Feature Complete and Technically Validated

The current Fin E-Scale implementation has completed:

```text
Authentication                  ✓
Dashboard                      ✓
Customer Segmentation           ✓
Churn Analysis                 ✓
Customer Lifetime Value        ✓
Market Basket Analysis         ✓
Recommendations                ✓
Sales Forecasting V4.1         ✓
Forecast Explainability        ✓
Business Insights              ✓
Risk Alerts                    ✓
Notifications                  ✓
Notification Deduplication     ✓
PostgreSQL Integration         ✓
Backend Health Validation      ✓
Responsive UI Validation       ✓
TypeScript Validation          ✓
Production Build Validation   ✓
Source Cleanup                 ✓
```

The V4.1 forecasting pipeline and current dashboard implementation are frozen for final documentation, demonstration, deployment preparation, and project submission.

---

## Final Workflow

```text
                    Fin E-Scale
                         |
                         v
                 Historical Data
                         |
                         v
               Business Analytics
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
      Customer       Product        Sales
    Intelligence    Analytics     Forecasting
          |              |              |
          +--------------+--------------+
                         |
                         v
                 Business Insights
                         |
              +----------+----------+
              |          |          |
              v          v          v
       Recommendations  Risks  Explainability
              |          |          |
              +----------+----------+
                         |
                         v
                   Notifications
                         |
                         v
              Decision Support
                         |
                         v
                    Business
                    Action
```

**Fin E-Scale — From e-commerce data to intelligent business decisions.**

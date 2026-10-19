# AE Trial Factory

AE Trial Factory is an automated solution evaluation and workflow demonstration platform for AutomationEdge. It enables rapid prototyping of end-to-end automation trials by ingesting IT service desk ticket dumps (e.g., OTRS, ServiceNow), integrating with the DiscoveryEdge AI clustering pipeline, and presenting actionable workflow automation candidates with quantified ROI and time savings.

## Overview

The platform bridges the gap between raw customer support ticket data and production-ready AutomationEdge Process Studio workflows:

1. Ingestion: Staging and schema validation of IT ticket dumps (Excel/CSV).
2. Discovery Pipeline: Secure authentication and communication with DiscoveryEdge to cluster ticket taxonomies and identify recurring manual intents.
3. Interactive Simulation: Visual simulation showing workflow mapping, automation coverage, and projected monthly cost savings.
4. Candidate Lifecycle Review: Role-based provisioning tracker demonstrating automated account setup across Active Directory, Microsoft 365, OrangeHRM, and IT service desks.

## Key Features

- Ticket Data Intake: File upload interface supporting OTRS and generic ITSM ticket formats.
- DiscoveryEdge API Integration: Automatic login, job creation, status polling, and workflow candidate extraction against DiscoveryEdge REST endpoints.
- Single-Trigger Execution: Decoupled file staging and simulation execution to prevent duplicate job creation and respect backend concurrency constraints.
- Workflow Catalog: Pre-mapped and live-discovered Process Studio (.psw) workflows covering password resets, employee separation, VPN provisioning, and software setups.
- Real-time Metrics: Dynamic computation of monthly ticket volumes, hours saved, and projected cost savings.
- Interactive Dashboard: Tabbed single-page application built with clean semantic HTML, vanilla CSS, and JavaScript.

## Technology Stack

- Backend: Node.js, Express 5, Multer, native Fetch API
- Frontend: HTML5, CSS3, Vanilla JavaScript
- API Tooling: Postman collection (DiscoveryEdge.postman_collection.json)
- Integration: DiscoveryEdge AI Discovery Engine

## Prerequisites

- Node.js version 18.0.0 or higher
- npm version 9.0.0 or higher
- Access to a DiscoveryEdge instance or Cloudflare tunnel endpoint

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abhishekmalwadkar-png/AE_TrialFactory.git
   cd AE_TrialFactory
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

The application can be configured using environment variables:

- PORT: Server port (default: 3000)
- DISCOVERY_EDGE_URL: DiscoveryEdge backend URL (default: https://employers-wholesale-nails-hoped.trycloudflare.com)

## Running the Application

1. Start the server:
   ```bash
   node server.js
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Application Workflow

1. Upload Tab: Select or drop an OTRS ticket dump (e.g., OTRS_Tickets_Overview_v7.xlsx) and specify your user email. Click Upload Dump to stage the file locally.
2. Simulate Tab: Review the staged file and click Simulate. The system triggers the DiscoveryEdge intake, polls for job completion, and renders discovered workflows with ROI projections.
3. Review & Provision: Navigate through discovered automation candidates and review provisioning status across target IT systems.

## Repository Structure

```
AE_TrialFactory/
├── .gitignore                          # Git ignore rules for node_modules and uploads
├── README.md                           # Project documentation
├── DiscoveryEdge.postman_collection.json # DiscoveryEdge API Postman collection
├── OTRS_Tickets_Overview_v7.xlsx       # Sample OTRS ticket dataset for demonstration
├── package.json                        # Node.js project manifest and dependencies
├── package-lock.json                   # Dependency lock file
├── server.js                           # Express backend and DiscoveryEdge API proxy
├── public/                             # Frontend assets
│   ├── index.html                      # Main web application layout
│   ├── app.js                          # Frontend interaction logic and API handling
│   └── styles.css                      # Application styling and responsive layout
└── uploads/                            # Staging folder for uploaded files
```

## API Endpoints

- POST /api/discovery/upload: Authenticates with DiscoveryEdge, creates ticket analysis job, polls status, and extracts candidate workflows.
- POST /api/upload: General file upload endpoint for trial attachments.
- GET /api/workflows: Fetches the current list of candidate workflows and summary metrics.
- GET /api/state: Returns current session state and onboarding candidates.
- POST /api/state/reset: Resets simulation candidates to initial state.
- ALL /my-backend/start-bot-chat: DirectLine token generator for chatbot integration.

## License

ISC License. Distributed as part of the AutomationEdge ecosystem.

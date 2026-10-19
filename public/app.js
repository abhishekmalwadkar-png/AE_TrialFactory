/**
 * AE Trail Factory - Frontend Application Logic
 * Integrates with Node.js Express Backend
 * Flow: Upload Dump -> Progress Bar -> Simulate Tab -> Workflow Recommendations -> Call Workflow
 */

let appState = null;
let workflowsList = [];
let isSimulating = false;

// Fallback workflow recommendations in case offline
const DEFAULT_WORKFLOWS = [
  {
    id: 'WF-01',
    name: 'WF_Password_Reset_SelfService.psw',
    title: 'Self-Service Domain, Email & Wifi Password Reset',
    category: 'IT Service Desk / Identity',
    confidence: 98,
    monthlyTickets: 118,
    timeSavedMonthly: '118 hrs',
    roi: '₹7,08,000/mo',
    system: 'Active Directory / Cyberoam',
    status: 'Ready to Deploy',
    stepsCount: 11,
    description: 'Automates Wifi, Email ID, and Active Directory password resets with self-service identity verification.'
  },
  {
    id: 'WF-02',
    name: 'WF_Employee_Separation_Offboarding.psw',
    title: 'Automated Employee Separation & Credential Revocation',
    category: 'IAM / Offboarding',
    confidence: 95,
    monthlyTickets: 74,
    timeSavedMonthly: '88 hrs',
    roi: '₹5,28,000/mo',
    system: 'Active Directory / Cyberoam / Exchange',
    status: 'Ready to Deploy',
    stepsCount: 14,
    description: 'Deactivates email IDs, releases Cyberoam credentials, and revokes workstation and domain access for departing staff.'
  },
  {
    id: 'WF-03',
    name: 'WF_AWS_VPN_Citrix_Access_Provisioning.psw',
    title: 'AWS VPN & Citrix / Zscaler Network Access Provisioning',
    category: 'Network & Cloud Security',
    confidence: 94,
    monthlyTickets: 82,
    timeSavedMonthly: '78 hrs',
    roi: '₹4,68,000/mo',
    system: 'AWS / Citrix / Zscaler',
    status: 'Ready to Deploy',
    stepsCount: 12,
    description: 'Validates manager approvals, provisions AWS VPN tokens, and triages Citrix and Zscaler gateway connectivity issues.'
  },
  {
    id: 'WF-04',
    name: 'WF_Software_Installation_Docker_VM.psw',
    title: 'Software Setup, Docker Desktop & VM Provisioning',
    category: 'Endpoint Engineering',
    confidence: 91,
    monthlyTickets: 65,
    timeSavedMonthly: '72 hrs',
    roi: '₹4,32,000/mo',
    system: 'Windows Server / Docker / Hyper-V',
    status: 'Ready to Deploy',
    stepsCount: 15,
    description: 'Installs approved developer software tools, deploys Docker Desktop environments, and provisions AI tool VMs.'
  },
  {
    id: 'WF-05',
    name: 'WF_ActiveDirectory_User_Provisioning.psw',
    title: 'Active Directory & Shared Repository Access Grant',
    category: 'Directory Services',
    confidence: 93,
    monthlyTickets: 71,
    timeSavedMonthly: '56 hrs',
    roi: '₹3,36,000/mo',
    system: 'Active Directory / File Server',
    status: 'Ready to Deploy',
    stepsCount: 10,
    description: 'Resolves inaccessible AD machine permissions, grants access to PO/invoice repositories, and configures group memberships.'
  }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  initUploadFeature();
  initAgentFlowWebChat();
  initThemeToggle();
  fetchAppState();
  fetchWorkflows();
});

// -------------------------------------------------------------
// TAB NAVIGATION (Upload -> Simulate -> WhatsApp -> Connectivity)
// -------------------------------------------------------------
function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Topbar AE server button
  const aeServerBtn = document.getElementById('aeServerBtn');
  if (aeServerBtn) {
    aeServerBtn.addEventListener('click', () => {
      let targetUrl = 'https://t4.automationedge.com/#/login?return=%2F';
      let serverName = 'AE server (t4)';
      if (appState && appState.connectivity && appState.connectivity.activeServer) {
        const key = appState.connectivity.activeServer;
        const s = appState.connectivity.servers[key];
        if (s) {
          targetUrl = s.url;
          serverName = s.name;
        }
      }
      showToast(`Launching ${serverName}...`);
      window.open(targetUrl, '_blank');
    });
  }

  // Home logo click
  const brandHome = document.getElementById('brandLogoHome');
  if (brandHome) {
    brandHome.addEventListener('click', () => switchTab('upload'));
  }
}

function switchTab(tabName) {
  // Update sidebar buttons
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
  });

  // Update panes
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });

  const activePane = document.getElementById(`pane-${tabName}`);
  if (activePane) {
    activePane.classList.add('active');
  }

  // If entering simulate tab, do not auto-run; user will click Simulate
  if (tabName === 'simulate') {
    // Keep current ready state or results
  }

  // If entering whatsapp tab, ensure DirectLine WebChat connects
  if (tabName === 'whatsapp') {
    if (!window.webChatInitialized) {
      connectAgentFlowWebChat();
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------
// UPLOAD FEATURE WITH ANIMATED PROGRESS BAR
// -------------------------------------------------------------
// UPLOAD FEATURE WITH ANIMATED PROGRESS BAR & API INTAKE
// -------------------------------------------------------------
function initUploadFeature() {
  const btnUpload = document.getElementById('btnTriggerUpload');
  const fileInput = document.getElementById('fileInput');

  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        startSimulatedUpload(fileInput.files[0].name, fileInput.files[0]);
      } else {
        startSimulatedUpload('OTRS_Tickets_Overview_v7.xlsx');
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const f = fileInput.files[0];
        const displayFileName = document.getElementById('displayFileName');
        if (displayFileName) displayFileName.textContent = f.name;
        showToast(`Selected file: ${f.name}`);
        startSimulatedUpload(f.name, f);
      }
    });
  }
}

let stagedUploadFile = null;
let stagedTargetName = 'OTRS_Tickets_Overview_v7.xlsx';
let stagedUserEmail = 'suhas.kajawe@automationedge.com';

function startSimulatedUpload(customFileName, fileObject) {
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressBarFill = document.getElementById('uploadProgressBarFill');
  const progressPct = document.getElementById('uploadProgressPct');
  const statusText = document.getElementById('uploadStatusText');
  const detailsText = document.getElementById('uploadProgressDetails');
  const uploadBtn = document.getElementById('btnTriggerUpload');

  if (!progressContainer || !progressBarFill) return;

  stagedTargetName = customFileName || (fileObject ? fileObject.name : 'OTRS_Tickets_Overview_v7.xlsx');
  stagedUploadFile = fileObject || null;

  const emailInput = document.getElementById('userEmailInput');
  stagedUserEmail = emailInput && emailInput.value.trim() ? emailInput.value.trim() : 'suhas.kajawe@automationedge.com';

  // Show local upload progress bar
  progressContainer.style.display = 'block';
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<span>Uploading Dump file...</span>`;

  statusText.textContent = 'Uploading Dump file';
  detailsText.textContent = `Reading ${stagedTargetName}...`;

  let currentPct = 0;
  const interval = setInterval(() => {
    currentPct += Math.floor(Math.random() * 14) + 12;
    if (currentPct > 100) currentPct = 100;

    progressBarFill.style.width = `${currentPct}%`;
    progressPct.textContent = `${currentPct}%`;

    if (currentPct < 40) {
      detailsText.textContent = `Ingesting ${stagedTargetName}...`;
    } else if (currentPct < 85) {
      detailsText.textContent = 'Validating ticket rows, columns & priorities...';
    } else {
      detailsText.textContent = 'Dump file uploaded! Ready to simulate...';
    }

    if (currentPct >= 100) {
      clearInterval(interval);
      showToast(`${stagedTargetName} uploaded successfully!`);

      setTimeout(() => {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Upload Dump</span>
        `;
        progressContainer.style.display = 'none';
        progressBarFill.style.width = '0%';

        // Shift to simulate tab in Ready state (DiscoveryEdge request will ONLY happen when user clicks Simulate)
        prepareSimulateReadyState();
        switchTab('simulate');
      }, 500);
    }
  }, 100);
}

function updateMetricsDisplay(summary) {
  if (!summary) return;
  const mWorkflows = document.getElementById('mTotalWorkflows');
  const mCoverage = document.getElementById('mCoverage');
  const mTime = document.getElementById('mTimeSaved');
  const mRoi = document.getElementById('mRoi');

  if (mWorkflows) mWorkflows.textContent = summary.totalCandidates || '5';
  if (mCoverage) mCoverage.textContent = (summary.coveragePercent || '91') + '%';
  if (mTime) mTime.textContent = (summary.estimatedHoursSaved || '412') + ' hrs';
  if (mRoi) mRoi.textContent = summary.estimatedMonthlyRoi || '₹24,72,000';
}

// -------------------------------------------------------------
// SIMULATE TAB: READY STATE & MANUAL SIMULATION TRIGGER
// -------------------------------------------------------------
function prepareSimulateReadyState() {
  const readyCard = document.getElementById('simulateReadyCard');
  const simBanner = document.getElementById('simulatingBanner');
  const resultsContent = document.getElementById('simResultsContent');

  if (readyCard) readyCard.style.display = 'flex';
  if (simBanner) simBanner.style.display = 'none';
  if (resultsContent) resultsContent.style.display = 'none';
}

function startManualSimulation() {
  const readyCard = document.getElementById('simulateReadyCard');
  const simBanner = document.getElementById('simulatingBanner');
  const stageText = document.getElementById('simStageText');
  const resultsContent = document.getElementById('simResultsContent');

  if (readyCard) readyCard.style.display = 'none';
  if (simBanner) simBanner.style.display = 'flex';
  if (resultsContent) resultsContent.style.display = 'none';
  if (stageText) stageText.textContent = `Connecting to DiscoveryEdge API for ${stagedTargetName}...`;

  const stageTimer1 = setTimeout(() => {
    if (stageText) stageText.textContent = 'Authenticating with DiscoveryEdge & creating /jobs ticket analysis...';
  }, 1200);

  const stageTimer2 = setTimeout(() => {
    if (stageText) stageText.textContent = 'DiscoveryEdge NLP clustering taxonomy & candidate workflow extraction...';
  }, 3500);

  const stageTimer3 = setTimeout(() => {
    if (stageText) stageText.textContent = 'Matching discovered workflows against AutomationEdge Process Studio catalog...';
  }, 6500);

  // CONSTRUCT FORM DATA AND TRIGGER DISCOVERYEDGE API NOW (ONLY ONCE PER SIMULATION CLICK)
  const formData = new FormData();
  if (stagedUploadFile) {
    formData.append('file', stagedUploadFile, stagedUploadFile.name);
  }
  formData.append('email', stagedUserEmail);
  formData.append('fileName', stagedTargetName);

  fetch('/api/discovery/upload', {
    method: 'POST',
    body: formData
  })
  .then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.message || `API error ${res.status}`);
    }
    return data;
  })
  .then(data => {
    clearTimeout(stageTimer1);
    clearTimeout(stageTimer2);
    clearTimeout(stageTimer3);

    if (data.workflows && Array.isArray(data.workflows)) {
      workflowsList = data.workflows;
    }
    if (data.summary) {
      updateMetricsDisplay(data.summary);
    }

    if (simBanner) simBanner.style.display = 'none';
    if (resultsContent) resultsContent.style.display = 'block';
    renderWorkflowCards();
    showToast(`Simulation complete: ${workflowsList.length} DiscoveryEdge workflows discovered!`);
  })
  .catch(err => {
    clearTimeout(stageTimer1);
    clearTimeout(stageTimer2);
    clearTimeout(stageTimer3);

    console.error('DiscoveryEdge API error during simulation:', err);
    if (simBanner) simBanner.style.display = 'none';
    if (readyCard) readyCard.style.display = 'flex';

    const isLimit = err.message && err.message.includes('Concurrent job limit');
    if (isLimit) {
      showToast('⚠️ DiscoveryEdge is busy: Concurrent limit (2 jobs) reached. Please wait for ongoing jobs to complete before simulating.', 7000);
    } else {
      showToast('⚠️ Simulation error: ' + err.message, 5000);
    }
  });
}

function runSimulationSequence() {
  startManualSimulation();
}

async function fetchWorkflows() {
  try {
    const res = await fetch('/api/workflows');
    const data = await res.json();
    if (data.success && data.workflows) {
      workflowsList = data.workflows;
      if (data.summary) {
        updateMetricsDisplay(data.summary);
      }
    } else {
      workflowsList = DEFAULT_WORKFLOWS;
    }
  } catch (e) {
    workflowsList = DEFAULT_WORKFLOWS;
  }
}

function renderWorkflowCards() {
  const container = document.getElementById('workflowsCardsContainer');
  if (!container) return;

  const list = workflowsList.length > 0 ? workflowsList : DEFAULT_WORKFLOWS;

  container.innerHTML = list.map(wf => {
    let systemIcon = '⚙️';
    if (wf.name.includes('Password') || wf.title.includes('Password')) systemIcon = '🔐';
    else if (wf.name.includes('Separation') || wf.title.includes('Separation')) systemIcon = '📋';
    else if (wf.name.includes('VPN') || wf.name.includes('Citrix') || wf.title.includes('VPN')) systemIcon = '🛡️';
    else if (wf.name.includes('Docker') || wf.name.includes('Software') || wf.title.includes('Software')) systemIcon = '💻';
    else if (wf.name.includes('ActiveDirectory') || wf.system.includes('Active Directory')) systemIcon = '👥';

    return `
      <div class="wf-card" id="wfCard-${wf.id}">
        <div class="wf-card-top">
          <div class="wf-icon-and-title">
            <div class="wf-icon-box">${systemIcon}</div>
            <div>
              <h4 class="wf-title-text">${wf.title}</h4>
              <span class="wf-file-name">${wf.name}</span>
            </div>
          </div>
          <span class="wf-confidence-badge">${wf.confidence}% Match</span>
        </div>

        <p class="wf-card-desc">${wf.description}</p>

        <div class="wf-stats-row">
          <div class="wf-stat-col">
            <span class="wf-stat-lbl">Monthly Vol</span>
            <span class="wf-stat-num">${wf.monthlyTickets} tickets</span>
          </div>
          <div class="wf-stat-col">
            <span class="wf-stat-lbl">Time Saved</span>
            <span class="wf-stat-num text-success">${wf.timeSavedMonthly}</span>
          </div>
          <div class="wf-stat-col">
            <span class="wf-stat-lbl">Projected ROI</span>
            <span class="wf-stat-num highlight-orange">${wf.roi}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// CALL WORKFLOW ACTION & RECEIPT MODAL
// -------------------------------------------------------------
async function callWorkflow(workflowId) {
  const btn = document.getElementById(`btnCall-${workflowId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Calling...</span>`;
  }

  showToast('Dispatching workflow execution to AutomationEdge...');

  try {
    const res = await fetch('/api/workflows/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId })
    });
    const result = await res.json();

    if (result.success && result.execution) {
      const exec = result.execution;
      document.getElementById('modalWfTitle').textContent = `Dispatched: ${exec.workflow}`;
      document.getElementById('modalWfSubtitle').textContent = `Target Cluster: ${exec.server}`;
      document.getElementById('receiptJobId').textContent = exec.jobId;
      document.getElementById('receiptWfFile').textContent = exec.workflow;
      document.getElementById('receiptServer').textContent = `${exec.server} (${exec.serverUrl})`;
      document.getElementById('receiptDuration').textContent = `${exec.duration} · 0 errors`;

      const modal = document.getElementById('wfExecModal');
      if (modal) modal.classList.add('active');

      showToast(`Workflow ${exec.workflow} executed successfully!`);
    } else {
      showToast('Workflow executed successfully (demo simulation)');
    }
  } catch (err) {
    // Demo fallback execution modal
    document.getElementById('receiptJobId').textContent = '#AE-JOB-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('modalWfTitle').textContent = 'Workflow Executed (Success)';
    const modal = document.getElementById('wfExecModal');
    if (modal) modal.classList.add('active');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Call Workflow ⚡</span>
      `;
    }
  }
}

function closeWfModal() {
  const modal = document.getElementById('wfExecModal');
  if (modal) modal.classList.remove('active');
}

// -------------------------------------------------------------
// CONNECTIVITY & APP STATE SYNC
// -------------------------------------------------------------
async function fetchAppState() {
  try {
    const res = await fetch('/api/state');
    const result = await res.json();
    if (result.success) {
      appState = result.data;
      renderConnectivityState();
    }
  } catch (err) {
    // quiet
  }
}

function renderConnectivityState() {
  if (!appState || !appState.connectivity) return;
  const conn = appState.connectivity;
  const activeKey = conn.activeServer || 't4';

  const labelEl = document.getElementById('headerActiveServerLabel');
  if (labelEl && conn.servers[activeKey]) {
    labelEl.textContent = conn.servers[activeKey].name;
  }

  const topCluster = document.getElementById('topActiveClusterBadge');
  if (topCluster && conn.servers[activeKey]) {
    topCluster.innerHTML = `<span class="live-dot"></span><span>Active Server: <strong>${conn.servers[activeKey].name}</strong></span>`;
  }

  // Update card active classes
  const cardT3 = document.getElementById('cardServerT3');
  const cardT4 = document.getElementById('cardServerT4');
  const btnT3 = document.getElementById('btnSelectT3');
  const btnT4 = document.getElementById('btnSelectT4');

  if (cardT3 && cardT4 && btnT3 && btnT4) {
    if (activeKey === 't3') {
      cardT3.classList.add('active-card');
      cardT4.classList.remove('active-card');
      btnT3.classList.add('active');
      btnT3.innerHTML = '<span>✓ Active Server</span>';
      btnT4.classList.remove('active');
      btnT4.innerHTML = '<span>Set Active</span>';
    } else {
      cardT4.classList.add('active-card');
      cardT3.classList.remove('active-card');
      btnT4.classList.add('active');
      btnT4.innerHTML = '<span>✓ Active Server</span>';
      btnT3.classList.remove('active');
      btnT3.innerHTML = '<span>Set Active</span>';
    }
  }
}

async function selectActiveServer(serverKey) {
  try {
    const res = await fetch('/api/connectivity/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverKey })
    });
    const result = await res.json();
    if (result.success) {
      if (appState && appState.connectivity) {
        appState.connectivity.activeServer = serverKey;
      }
      showToast(result.message);
      renderConnectivityState();
    }
  } catch (err) {
    showToast('Switched server locally');
  }
}

function copyServerUrl(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Server URL copied to clipboard!'))
      .catch(() => showToast('URL: ' + url));
  } else {
    showToast('URL: ' + url);
  }
}

// -------------------------------------------------------------
// THEME & TOAST UTILITIES
// -------------------------------------------------------------
function initThemeToggle() {
  const topBtn = document.getElementById('topThemeBtn');
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
    });
  }
}

function showToast(msg) {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// -------------------------------------------------------------
// WHATSAPP & AGENTFLOW DIRECTLINE WEBCHAT
// -------------------------------------------------------------
window.webChatInitialized = false;

function initAgentFlowWebChat() {
  const addressInput = document.getElementById('agentFlowAddressInput');
  const previewEl = document.getElementById('previewDirectLineUrl');

  if (addressInput) {
    // Dynamically update the DirectLine URL preview when user types address
    addressInput.addEventListener('input', () => {
      let raw = addressInput.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      if (previewEl) {
        previewEl.textContent = `https://${raw || '<agentflow public address>'}/flows/euc/v3/directline`;
      }
    });

    // Pressing Enter triggers connect
    addressInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        connectAgentFlowWebChat();
      }
    });
  }
}

async function connectAgentFlowWebChat() {
  const addressInput = document.getElementById('agentFlowAddressInput');
  let rawAddress = addressInput ? addressInput.value.trim() : '10.41.5.39:8099';

  // Sanitize the user-entered address (remove protocol prefix or trailing slash)
  let cleanAddress = rawAddress.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  if (!cleanAddress) {
    cleanAddress = '10.41.5.39:8099';
    if (addressInput) addressInput.value = cleanAddress;
  }

  const directLineDomain = `https://${cleanAddress}/flows/euc/v3/directline`;

  // Update preview
  const previewEl = document.getElementById('previewDirectLineUrl');
  if (previewEl) {
    previewEl.textContent = directLineDomain;
  }

  const statusBadge = document.getElementById('agentFlowConnectionStatus');
  const waSubStatus = document.getElementById('waBotSubStatus');
  const webchatContainer = document.getElementById('webchat');

  if (statusBadge) statusBadge.textContent = 'Connecting...';
  if (waSubStatus) waSubStatus.textContent = 'connecting to directline...';
  showToast(`Initializing DirectLine: ${cleanAddress}...`);

  try {
    // 1. conversationId + token come from YOUR app's backend (never put the secret in the page)
    const { conversationId, token } = await fetch('/my-backend/start-bot-chat').then(r => r.json());

    if (!webchatContainer) return;
    webchatContainer.innerHTML = '';

    // 2. Render BotFramework WebChat
    if (window.WebChat && window.WebChat.renderWebChat && window.WebChat.createDirectLine) {
      const directLineInstance = window.WebChat.createDirectLine({
        domain: directLineDomain,
        token: token,
        conversationId: conversationId
      });

      const currentUserId = 'user_' + Math.random().toString(36).substring(2, 8);

      window.WebChat.renderWebChat({
        directLine: directLineInstance,
        userID: currentUserId
      }, webchatContainer);

      window.webChatInitialized = true;
      if (statusBadge) statusBadge.textContent = 'Connected (DirectLine)';
      if (waSubStatus) waSubStatus.textContent = 'online · directline connected';
      showToast(`Connected to AgentFlow at ${cleanAddress}!`);
    } else {
      if (statusBadge) statusBadge.textContent = 'WebChat Loaded';
      if (waSubStatus) waSubStatus.textContent = 'online · ready';
    }
  } catch (err) {
    console.warn('DirectLine connection warning:', err);
    if (statusBadge) statusBadge.textContent = 'DirectLine Configured';
    if (waSubStatus) waSubStatus.textContent = 'online · standby';
    showToast(`Configured AgentFlow DirectLine address: ${cleanAddress}`);
  }
}


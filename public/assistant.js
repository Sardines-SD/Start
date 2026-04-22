// SMART REPORT ASSISTANT
let assistantStep = 0;
let assistantData = {};
let assistantTempId = null;
let currentUser = null;
let currentUserName = null;

export function initAssistant(user, userName) {
  currentUser = user;
  currentUserName = userName;
}

function getDisplayName() {
  if (currentUserName) return currentUserName;
  if (currentUser) return currentUser.email.split('@')[0];
  return "there";
}

export function toggleAssistant() {
  const modal = document.getElementById('assistantModal');
  if (modal.style.display === 'flex') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'flex';
    if (assistantStep === 0) {
      assistantStep = 1;
      addAssistantMessage('bot', `Hello ${getDisplayName()}! What would you like to do?`);
      addMainOptions();
    }
  }
}

function addMainOptions() {
  const container = document.getElementById('assistantMessages');
  const div = document.createElement('div');
  div.className = 'assistant-message bot';
  
  const options = [
    { label: 'Create Request', action: 'create' },
    { label: 'Track Request', action: 'track' },
    { label: 'Delete Request', action: 'deleteReq' },
    { label: 'Delete Account', action: 'deleteAcc' }
  ];
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerText = opt.label;
    btn.style.cssText = `
      background: #2b5fa8;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      margin: 5px;
      cursor: pointer;
      font-size: 13px;
    `;
    btn.onclick = () => {
      if (opt.action === 'create') startCreateRequest();
      if (opt.action === 'track') startTrackRequest();
      if (opt.action === 'deleteReq') startDeleteRequest();
      if (opt.action === 'deleteAcc') startDeleteAccount();
    };
    div.appendChild(btn);
  });
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addAssistantMessage(type, text) {
  const container = document.getElementById('assistantMessages');
  const div = document.createElement('div');
  div.className = `assistant-message ${type}`;
  div.innerText = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addAssistantCard(title, content, buttons = null) {
  const container = document.getElementById('assistantMessages');
  const div = document.createElement('div');
  div.className = 'assistant-message bot';
  div.style.padding = '0';
  div.style.background = 'transparent';
  div.style.border = 'none';
  
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 15px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  
  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 10px;
    color: #2b5fa8;
  `;
  titleEl.innerText = title;
  card.appendChild(titleEl);
  
  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    font-size: 14px;
    color: #333;
    line-height: 1.5;
  `;
  contentEl.innerHTML = content;
  card.appendChild(contentEl);
  
  if (buttons) {
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 15px;
      justify-content: flex-end;
    `;
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerText = btn.label;
      button.style.cssText = `
        background: ${btn.primary ? '#2b5fa8' : '#6c757d'};
        color: white;
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
      `;
      button.onclick = btn.onclick;
      btnContainer.appendChild(button);
    });
    card.appendChild(btnContainer);
  }
  
  div.appendChild(card);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addAssistantInput(placeholder, onSubmit) {
  const container = document.getElementById('assistantMessages');
  const div = document.createElement('div');
  div.className = 'assistant-message bot';
  div.style.padding = '0';
  div.style.background = 'transparent';
  
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 15px;
    border: 1px solid #ddd;
    display: flex;
    gap: 10px;
  `;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.cssText = `
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
  `;
  
  const sendBtn = document.createElement('button');
  sendBtn.innerText = 'Send';
  sendBtn.style.cssText = `
    background: #2b5fa8;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
  `;
  
  sendBtn.onclick = () => {
    const value = input.value.trim();
    if (value) {
      div.remove();
      onSubmit(value);
    }
  };
  
  input.onkeypress = (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      if (value) {
        div.remove();
        onSubmit(value);
      }
    }
  };
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendBtn);
  div.appendChild(inputContainer);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addAssistantOptions(options, onSelect) {
  const container = document.getElementById('assistantMessages');
  const div = document.createElement('div');
  div.className = 'assistant-message bot';
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerText = opt;
    btn.style.cssText = `
      background: #2b5fa8;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      margin: 5px;
      cursor: pointer;
      font-size: 13px;
    `;
    btn.onclick = () => {
      div.remove();
      onSelect(opt);
    };
    div.appendChild(btn);
  });
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// CREATE REQUEST
function startCreateRequest() {
  assistantStep = 2;
  addAssistantMessage('bot', 'What type of issue are you reporting?');
  addAssistantOptions(['Pothole', 'Water Issue', 'Electricity', 'Waste'], (category) => {
    assistantData.category = category;
    addAssistantMessage('user', category);
    addAssistantMessage('bot', 'Great! Now describe the issue in detail.');
    assistantStep = 3;
    addAssistantInput('Type your description here...', (description) => {
      addAssistantMessage('user', description);
      assistantData.description = description;
      addAssistantMessage('bot', 'Do you want to upload a photo?');
      addAssistantOptions(['Yes, upload now', 'No, submit without photo'], (choice) => {
        addAssistantMessage('user', choice);
        fillReportForm(assistantData.category, assistantData.description);
        addAssistantMessage('bot', 'Report form filled! Click "Submit Request" to complete.');
        assistantStep = 1;
        assistantData = {};
        setTimeout(() => toggleAssistant(), 3000);
      });
    });
  });
}

// TRACK REQUEST
async function startTrackRequest() {
  addAssistantMessage('bot', 'Enter the Request ID to track:');
  addAssistantInput('Type Request ID here...', async (id) => {
    addAssistantMessage('user', id);
    await trackRequestById(id);
    showMainMenu();
  });
}

async function trackRequestById(id) {
  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/requests`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const requests = await res.json();
    const request = requests.find(r => r.id == id);
    
    if (request) {
      const statusColor = request.status === 'pending' ? '#856404' : 
                         (request.status === 'in-progress' ? '#004085' : '#155724');
      const statusBg = request.status === 'pending' ? '#fff3cd' : 
                      (request.status === 'in-progress' ? '#cce5ff' : '#d4edda');
      
      const content = `
        <div style="margin-bottom: 8px;"><strong>Category:</strong> ${escapeHtml(request.category)}</div>
        <div style="margin-bottom: 8px;"><strong>Description:</strong> ${escapeHtml(request.description)}</div>
        <div style="margin-bottom: 8px;"><strong>Status:</strong> <span style="background: ${statusBg}; color: ${statusColor}; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${escapeHtml(request.status)}</span></div>
        <div><strong>Date:</strong> ${request.createdAt || 'Unknown'}</div>
      `;
      addAssistantCard(`Request #${id}`, content);
    } else {
      addAssistantMessage('bot', `No request found with ID: ${id}`);
    }
  } catch (error) {
    console.error("Track error:", error);
    addAssistantMessage('bot', "Failed to fetch request. Please try again.");
  }
}

// DELETE REQUEST
function startDeleteRequest() {
  addAssistantMessage('bot', 'Enter the Request ID to delete:');
  addAssistantInput('Type Request ID here...', async (id) => {
    addAssistantMessage('user', id);
    assistantTempId = id;
    
    try {
      const token = await getFreshToken();
      const res = await fetch(`/api/requests`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const requests = await res.json();
      const request = requests.find(r => r.id == id);
      
      if (request) {
        const content = `
          <div><strong>Category:</strong> ${escapeHtml(request.category)}</div>
          <div><strong>Description:</strong> ${escapeHtml(request.description)}</div>
        `;
        addAssistantCard(`Delete Request #${id}?`, content, [
          { label: 'Yes, Delete', primary: true, onclick: () => confirmDeleteRequest(id) },
          { label: 'Cancel', primary: false, onclick: () => { showMainMenu(); } }
        ]);
      } else {
        addAssistantMessage('bot', `No request found with ID: ${id}`);
        showMainMenu();
      }
    } catch (error) {
      addAssistantMessage('bot', "Failed to fetch request. Please try again.");
      showMainMenu();
    }
  });
}

async function confirmDeleteRequest(id) {
  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/requests/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      addAssistantMessage('bot', `Request #${id} has been deleted successfully!`);
      loadRequests();
    } else {
      addAssistantMessage('bot', `Failed to delete request #${id}. Please try again.`);
    }
  } catch (error) {
    addAssistantMessage('bot', "Error deleting request. Please try again.");
  }
  showMainMenu();
}

// DELETE ACCOUNT
function startDeleteAccount() {
  addAssistantCard('⚠️ Delete Account', `
    <div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
      <strong>WARNING:</strong> This action is permanent and cannot be undone!
    </div>
    <div style="margin-bottom: 5px;">• Remove all your personal information</div>
    <div style="margin-bottom: 5px;">• Delete all your service requests</div>
    <div>• Remove your access to the portal</div>
  `, [
    { label: 'Yes, Continue', primary: true, onclick: () => askForEmail() },
    { label: 'Cancel', primary: false, onclick: () => { showMainMenu(); } }
  ]);
}

function askForEmail() {
  addAssistantMessage('bot', 'Type your email to confirm:');
  addAssistantInput('Enter your email...', (email) => {
    addAssistantMessage('user', email);
    if (email !== currentUser.email) {
      addAssistantMessage('bot', 'Email does not match your account email. Deletion cancelled.');
      showMainMenu();
    } else {
      askForDeleteKeyword();
    }
  });
}

function askForDeleteKeyword() {
  addAssistantMessage('bot', 'Type "DELETE" to confirm permanent deletion:');
  addAssistantInput('Type DELETE here...', async (keyword) => {
    addAssistantMessage('user', keyword);
    if (keyword !== 'DELETE') {
      addAssistantMessage('bot', 'You did not type "DELETE" correctly. Deletion cancelled.');
      showMainMenu();
    } else {
      try {
        const token = await getFreshToken();
        const res = await fetch('/api/me', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: 'Deleted via assistant' })
        });
        
        if (res.ok) {
          addAssistantMessage('bot', 'Your account has been permanently deleted. Redirecting...');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        } else {
          addAssistantMessage('bot', 'Failed to delete account. Please try again.');
          showMainMenu();
        }
      } catch (error) {
        addAssistantMessage('bot', 'Error deleting account. Please try again.');
        showMainMenu();
      }
    }
  });
}

function showMainMenu() {
  assistantStep = 1;
  addAssistantMessage('bot', 'What else can I do for you?');
  addMainOptions();
}

function fillReportForm(category, description) {
  const categoryMap = {
    'Pothole': 'Pothole',
    'Water Issue': 'Water',
    'Electricity': 'Electricity',
    'Waste': 'Waste'
  };
  
  const catSelect = document.getElementById('requestCategory');
  const catValue = categoryMap[category] || category;
  for (let i = 0; i < catSelect.options.length; i++) {
    if (catSelect.options[i].value === catValue) {
      catSelect.selectedIndex = i;
      break;
    }
  }
  
  document.getElementById('requestDescription').value = description;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

async function loadRequests() {
  const table = document.getElementById("requestsTableBody");
  if (!table) return;
  
  try {
    const token = await getFreshToken();
    const res = await fetch("/api/requests", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    // Update table logic here if needed
  } catch (error) {
    console.error("Load error:", error);
  }
}
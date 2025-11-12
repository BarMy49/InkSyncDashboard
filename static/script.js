// --- UI Elements ---
const tab1 = document.getElementById("tab1");
const tab2 = document.getElementById("tab2");
const content = document.getElementById("module-content");

let currentModule = null;
let currentData = null;
let editedData = null;

// --- Check module availability on load ---
document.addEventListener("DOMContentLoaded", () => {
    checkFiles();
});

// --- Check if JSON files exist ---
async function checkFiles() {
    try {
        const res = await fetch('/api/check');
        const data = await res.json();

        setTabState(tab1, data.module1);
        setTabState(tab2, data.module2);
    } catch (err) {
        console.error("Error checking modules:", err);
    }
}

// --- Update tab state based on availability ---
function setTabState(tab, available) {
    tab.classList.remove("enabled", "disabled", "active");
    if (available) {
        tab.classList.add("enabled");
        tab.onclick = () => {
            setActiveTab(tab);
            const page = tab.id === "tab1" ? "module1" : "module2";
            loadModule(page);
        };
    } else {
        tab.classList.add("disabled");
        tab.onclick = null;
    }
}

// --- Set active tab appearance ---
function setActiveTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
}

// --- Load module specs from JSON ---
async function loadModule(page) {
    try {
        const res = await fetch(`/api/${page}`);
        if (!res.ok) {
            content.innerHTML = `<p class="empty">Could not load ${page}.json</p>`;
            return;
        }
        const data = await res.json();
        currentModule = page;
        currentData = structuredClone(data);
        editedData = structuredClone(data);
        renderSpecs(editedData);
    } catch (err) {
        content.innerHTML = `<p class="empty">Error loading data.</p>`;
        console.error(err);
    }
}

function renderSpecs(data) {
    if (!data || Object.keys(data).length === 0) {
        content.innerHTML = `<p class="empty">No data available for this module.</p>`;
        return;
    }

    let html = "";

    // --- Module info ---
    if (data.info) {
        html += `
        <div class="info-section">
            <h3>Module Information</h3>
            <table class="info-table">
                ${Object.entries(data.info).slice(1).map(([k, v]) => `
                    <tr><td>${k}</td><td>${v}</td></tr>
                `).join('')}
            </table>
        </div>`;
    }

    // --- Keys or knobs ---
    if (data.keys) {
        html += `
        <div class="info-section">
            <h3>Key Assignments</h3>
            <table class="key-table">
                ${Object.entries(data.keys).map(([k, v]) => {
            if (data.info.type === "keypad") {
                return `
                        <tr>
                            <td>${k}</td>
                            <td><button class="edit-btn" data-key="${k}">${v}</button></td>
                        </tr>`;
            } else if (data.info.type === "knob_array") {
                const options = ["Volume Control", "Vertical Scroll", "Horizontal Scroll", "Brightness", "Zoom", "Custom Macro"];
                return `
                        <tr>
                            <td>${k}</td>
                            <td>
                                <div class="knob-select-wrapper">
                                    <select class="knob-select" data-key="${k}">
                                        ${options.map(opt => `<option value="${opt}" ${opt === v ? "selected" : ""}>${opt}</option>`).join('')}
                                    </select>
                                </div>
                            </td>
                        </tr>`;
            }
        }).join('')}
            </table>
        </div>`;
    }

    // --- Module-level Save / Cancel ---
    html += `
    <div class="save-controls">
        <button id="save-module">Save</button>
        <button id="cancel-module">Cancel</button>
    </div>`;

    content.innerHTML = html;

    // --- Keypad editing ---
    if (data.info.type === "keypad") {
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.onclick = () => openEditDialog(btn.dataset.key);
        });
    }

    // --- Knob array dropdown updates ---
    if (data.info.type === "knob_array") {
        document.querySelectorAll(".knob-select").forEach(sel => {
            sel.onchange = () => {
                const key = sel.dataset.key;
                editedData.keys[key] = sel.value;
            };
        });
    }

    // --- Module-level buttons ---
    document.getElementById("save-module").onclick = saveModule;
    document.getElementById("cancel-module").onclick = () => renderSpecs(currentData);

    // --- Update active tab name to module name ---
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && data.info["Module Name"]) {
        activeTab.textContent = data.info["Module Name"];
    }
}


// --- Open dialog for editing key assignment ---
function openEditDialog(keyName) {
    const dialog = document.createElement("div");
    dialog.className = "popup";
    dialog.innerHTML = `
        <div class="popup-content">
            <h3>Edit ${keyName}</h3>
            <div class="popup-controls">
                <input id="key-input" type="text" value="${editedData.keys[keyName] || ''}" readonly />
                <button id="clear-key">Clear</button>
            </div>
            <div class="special-keys">
                ${Array.from({length: 12}, (_, i) => `<button class="special-btn">F${i + 13}</button>`).join('')}
            </div>
            <div class="popup-controls">
                <button id="save-key">Save</button>
                <button id="cancel-key">Cancel</button>
            </div>
            <p class="hint">Press keys like Shift, Ctrl, Alt, F1-F12 — they’ll appear automatically.</p>
        </div>
    `;
    document.body.appendChild(dialog);

    const input = dialog.querySelector("#key-input");
    const saveBtn = dialog.querySelector("#save-key");
    const cancelBtn = dialog.querySelector("#cancel-key");
    const clearBtn = dialog.querySelector("#clear-key");

    clearBtn.onclick = () => {
        input.value = '';
    };

    let pressed = new Set();

    function updateInput() {
        input.value = Array.from(pressed).join('+');
    }

    function onKeyDown(e) {
        e.preventDefault();
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (!pressed.has(key)) pressed.add(key);
        updateInput();
    }

    function onKeyUp(e) {
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (pressed.has(key)) pressed.delete(key);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    dialog.querySelectorAll(".special-btn").forEach(b => {
        b.onclick = () => {
            const val = input.value.trim();
            input.value = val ? `${val}+${b.textContent}` : b.textContent;
        };
    });

    saveBtn.onclick = () => {
        editedData.keys[keyName] = input.value.trim();
        document.body.removeChild(dialog);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        renderSpecs(editedData);
    };

    cancelBtn.onclick = () => {
        document.body.removeChild(dialog);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
    };
}

// --- Show info popup ---
function showInfo(message, duration = 2000) {
    const popup = document.createElement("div");
    popup.className = "info-popup";
    popup.textContent = message;
    document.body.appendChild(popup);

    // Animate in
    setTimeout(() => {
        popup.style.opacity = "1";
        popup.style.transform = "translateY(0)";
    }, 50);

    // Remove after duration
    setTimeout(() => {
        popup.style.opacity = "0";
        popup.style.transform = "translateY(-20px)";
        setTimeout(() => document.body.removeChild(popup), 300);
    }, duration);
}

async function saveModule() {
    if (!currentModule || !editedData) return;
    try {
        const res = await fetch(`/api/save/${currentModule}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(editedData)
        });
        if (res.ok) {
            currentData = structuredClone(editedData);
            loadModule(currentModule);
            showInfo("Module saved successfully!");
        } else {
            showInfo("Failed to save module.");
        }
    } catch (err) {
        console.error("Error saving module:", err);
        showInfo("Error saving module.");
    }
}

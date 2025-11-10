// --- UI Elements ---
const tab1 = document.getElementById("tab1");
const tab2 = document.getElementById("tab2");
const content = document.getElementById("module-content");

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
            loadModule(tab.id === "tab1" ? "module1" : "module2");
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
        renderSpecs(data);
    } catch (err) {
        content.innerHTML = `<p class="empty">Error loading data.</p>`;
        console.error(err);
    }
}

// --- Render specs into content area ---
function renderSpecs(data) {
    if (!data || Object.keys(data).length === 0) {
        content.innerHTML = `<p class="empty">No data available for this module.</p>`;
        return;
    }

    let html = "";

    if (data.info) {
        html += `
        <div class="info-section">
            <h3>Module Information</h3>
            <table class="info-table">
                ${Object.entries(data.info).map(([k, v]) => `
                    <tr><td>${k}</td><td>${v}</td></tr>
                `).join('')}
            </table>
        </div>`;
    }

    if (data.specs) {
        html += `
        <div class="info-section">
            <h3>Specifications</h3>
            <table class="info-table">
                ${Object.entries(data.specs).map(([k, v]) => `
                    <tr><td>${k}</td><td>${v}</td></tr>
                `).join('')}
            </table>
        </div>`;
    }

    if (data.keys) {
        html += `
        <div class="info-section">
            <h3>Key Assignments</h3>
            <table class="key-table">
                ${Object.entries(data.keys).map(([k, v]) => `
                    <tr><td>${k}</td><td>${v}</td></tr>
                `).join('')}
            </table>
        </div>`;
    }

    content.innerHTML = html;
}

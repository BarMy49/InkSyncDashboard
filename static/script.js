// --- UI Elements ---
const tab1 = document.getElementById("tab1");
const tab2 = document.getElementById("tab2");
const content = document.getElementById("module-content");

let currentModule = null;
let currentData = null;
let activePage = null; // startowo brak aktywnej zakładki

document.addEventListener("DOMContentLoaded", () => {
    checkFiles();
    setInterval(checkFiles, 1000); // co sekundę aktualizujemy taby
});

// --- Check if JSON files exist ---
async function checkFiles() {
    try {
        const res = await fetch('/api/check');
        const data = await res.json();

        updateTab(tab1, data.module1, "module1");
        updateTab(tab2, data.module2, "module2");
    } catch (err) {
        console.error("Error checking modules:", err);
    }
}

// --- Update individual tab ---
async function updateTab(tab, available, page) {
    tab.classList.remove("enabled", "disabled", "active");

    if (available) {
        tab.classList.add("enabled");

        // nadajemy active tylko jeśli to current activePage
        if (activePage === page) {
            tab.classList.add("active");
        }

        tab.onclick = async () => {
            activePage = page;       // ustawiamy activePage po kliknięciu
            setActiveTab(tab);       // zmienia klasę active
            await loadModule(page);  // ładujemy moduł
        };

        // pobierz device_name jeśli możliwe
        try {
            const res = await fetch(`/api/${page}`);
            if (res.ok) {
                const moduleData = await res.json();
                tab.textContent = moduleData.device_name || page;
            } else {
                tab.textContent = page;
            }
        } catch {
            tab.textContent = page;
        }
    } else {
        tab.classList.add("disabled");
        tab.onclick = null;
        tab.textContent = page;
    }
}

// --- Set active tab appearance po kliknięciu ---
function setActiveTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
}

// --- Load module specs from JSON + module config ---
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

        // --- Load configuration using UUID ---
        let config = null;
        if (data.uuid) {
            const cfgRes = await fetch(`/api/config/${data.uuid}`);
            if (cfgRes.ok) {
                config = await cfgRes.json();
            }
        }

        renderSpecs(currentData, config);

    } catch (err) {
        content.innerHTML = `<p class="empty">Error loading data.</p>`;
        console.error(err);
    }
}

function renderSpecs(data, config) {
    if (!data || Object.keys(data).length === 0) {
        content.innerHTML = `<p class="empty">No data available for this module.</p>`;
        return;
    }

    let html = "";

    // --- Module info ---
    html += `
    <div class="info-section">
        <h3>Module Information</h3>
        <table class="info-table">
            <tr><td>Module Type</td><td>${data.module_type}</td></tr>
            <tr><td>Device Name</td><td>${data.device_name}</td></tr>
            <tr><td>UUID</td><td>${data.uuid}</td></tr>
            <tr><td>Slot</td><td>${data.slot}</td></tr>
            <tr><td>Manufacturer</td><td>${data.manufacturer}</td></tr>
            <tr><td>Firmware Version</td><td>${data.fw_version}</td></tr>
        </table>
    </div>`;

    // --- Configuration display (read-only) ---
    if (config && Object.keys(config).length > 0) {
        html += `
        <div class="info-section">
            <h3>Module Configuration</h3>
            <table class="info-table">
                ${Object.entries(config).map(([key, arr]) => `
                    <tr>
                        <td>${key}</td>
                        <td>${arr.join(", ")}</td>
                    </tr>
                `).join("")}
            </table>
        </div>`;
    }

    content.innerHTML = html;

    // --- Update tab label to device name if active ---
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && data.device_name) {
        activeTab.textContent = data.device_name;
    }
}

// --- Events ---
let events = [];
let calendar;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("calendar")) {
        initEventsPage();
        fetchEventsFromServer();
    }
});

function initEventsPage() {
    const calendarEl = document.getElementById("calendar");

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        selectable: true,
        editable: false,
        locale: 'pl',
        height: "100%",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        events: events,
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        dateClick(info) {
            openAddEventPopup(info.dateStr);
        },
        eventClick(info) {
            if (confirm(`Delete event "${info.event.title}"?`)) {
                removeEvent(info.event.extendedProps.id);
            }
        }
    });

    calendar.render();
    document.querySelector(".add-event-btn").onclick = () => openAddEventPopup();
}

// --- fetch events from Flask ---
function fetchEventsFromServer() {
    fetch("/api/events")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                events = data;
                renderEventList();
                renderCalendarEvents();
            } else {
                console.error("Unexpected response from server:", data);
            }
        })
        .catch(err => console.error("Error fetching events:", err));
}

// --- render list of events ---
function renderEventList() {
    const tbody = document.querySelector("#events-table tbody");
    tbody.innerHTML = "";
    events.forEach(event => {
        const tr = document.createElement("tr");

        const startStr = event.allDay
            ? new Date(event.start).toLocaleDateString()
            : formatDateTime(event.start);

        const endStr = event.allDay
            ? new Date(event.end).toLocaleDateString()
            : formatDateTime(event.end);

        tr.innerHTML = `
            <td>${event.name}</td>
            <td>${event.location}</td>
            <td>${startStr}</td>
            <td>${endStr}</td>
            <td>${event.allDay ? "Yes" : "No"}</td>
            <td>
                <button onclick="removeEvent('${event.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderCalendarEvents();
}

function renderCalendarEvents() {
    if (!calendar) return;
    calendar.removeAllEvents();
    events.forEach(ev => {
        calendar.addEvent({
            title: ev.name,
            start: ev.start,
            end: ev.end,
            allDay: ev.allDay,
            extendedProps: { id: ev.id, location: ev.location }
        });
    });
}

// --- remove event ---
function removeEvent(id) {
    events = events.filter(e => e.id !== id);
    renderEventList();

    fetch("/api/save/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(events)
    }).catch(err => console.error("Error saving events after delete:", err));
}

// --- format date time ---
function formatDateTime(dt) {
    const d = new Date(dt);
    return d.toLocaleString();
}

// --- popup to add new event ---
function openAddEventPopup(defaultDate = "") {
    const popup = document.createElement("div");
    popup.classList.add("popup");
    popup.innerHTML = `
        <div class="popup-content">
            <h3>Add Event</h3>
            <label>Name: <input type="text" id="event-name"></label>
            <label>Location: <input type="text" id="event-location"></label>
            <label>All Day: <input type="checkbox" id="event-allday"></label>
            <label>Start: <input type="datetime-local" id="event-start" value="${defaultDate ? defaultDate + 'T00:00' : ''}"></label>
            <label>End: <input type="datetime-local" id="event-end" value="${defaultDate ? defaultDate + 'T23:59' : ''}"></label>

            <div class="popup-actions">
                <button id="save-event-btn">Save</button>
                <button id="cancel-event-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const startInput = document.getElementById("event-start");
    const endInput = document.getElementById("event-end");
    const allDayCheckbox = document.getElementById("event-allday");

    allDayCheckbox.addEventListener("change", () => {
        if (allDayCheckbox.checked) {
            startInput.type = "date";
            endInput.type = "date";
        } else {
            startInput.type = "datetime-local";
            endInput.type = "datetime-local";
        }
    });

    document.getElementById("cancel-event-btn").onclick = () => popup.remove();

    document.getElementById("save-event-btn").onclick = () => {
        const name = document.getElementById("event-name").value.trim();
        const location = document.getElementById("event-location").value.trim();
        const start = startInput.value;
        const end = endInput.value;
        const allDay = allDayCheckbox.checked;

        if (!name || !location || !start || !end) {
            alert("Please fill all fields.");
            return;
        }
        if (!allDay && new Date(start) > new Date(end)) {
            alert("Start date/time cannot be after end date/time.");
            return;
        }

        const newEvent = {
            id: crypto.randomUUID(),
            name,
            location,
            start,
            end,
            allDay
        };

        events.push(newEvent);
        renderEventList();

        fetch("/api/save/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(events)
        }).catch(err => console.error("Error saving events:", err));

        popup.remove();
    };
}

// --- SETTINGS PAGE ---
async function refreshIndicators() {
    const services = ["microsoft", "apple", "google"];

    for (const s of services) {
        const res = await fetch(`/api/integration-status/${s}`);
        const data = await res.json();
        const indicator = document.getElementById(`indicator-${s}`);

        if (data.integrated === true) {
            indicator.classList.add("active");
        } else {
            indicator.classList.remove("active");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".integration-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const service = btn.dataset.service;

            await fetch("/api/integrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ service })
            });

            refreshIndicators();
        });
    });

    refreshIndicators();
});


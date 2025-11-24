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
        locale: 'en-us',
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
            extendedProps: {id: ev.id, location: ev.location}
        });
    });
}

// --- remove event ---
function removeEvent(id) {
    events = events.filter(e => e.id !== id);
    renderEventList();

    fetch("/api/save/events", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
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
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(events)
        }).catch(err => console.error("Error saving events:", err));

        popup.remove();
    };
}

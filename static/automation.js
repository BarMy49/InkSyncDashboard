document.addEventListener("DOMContentLoaded", () => {

    const cards = document.querySelectorAll(".automation-card");
    const popup = document.getElementById("automation-popup");
    const popupClose = document.getElementById("popup-close");
    const popupTitle = document.getElementById("popup-title");
    const blocksContainer = document.getElementById("editor-blocks");
    const addBlockBtn = document.getElementById("add-block-btn");

    let currentId = null;

    // open popup
    cards.forEach(card => {
        card.addEventListener("click", e => {
            // ignore clicks on the toggle switch
            if (e.target.tagName === "INPUT") return;

            currentId = card.dataset.id;
            popupTitle.textContent = "Automation: " + card.querySelector(".auto-title").textContent;

            blocksContainer.innerHTML = "";

            popup.classList.remove("hidden");
        });
    });

    // close popup
    popupClose.addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    // add block
    addBlockBtn.addEventListener("click", () => {
        const div = document.createElement("div");
        div.className = "block-entry";
        div.textContent = "New block";
        div.style.padding = "6px";
        div.style.border = "1px solid #bbb";
        div.style.marginBottom = "6px";
        div.style.borderRadius = "4px";
        blocksContainer.appendChild(div);
    });

});

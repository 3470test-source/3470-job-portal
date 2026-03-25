
                            /*--------------------- Dashboard sidebar menu -------------------------*/
  
// =========================
// ✅ OPEN MODAL
// =========================
function openModal(e, modalId) {
  e.stopPropagation(); // prevent collapse
  document.getElementById(modalId).style.display = "block";
}


// =========================
// ✅ CLOSE MODAL
// =========================
function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}


// =========================
// ✅ APPLY BUTTON (WORKS FOR ALL MODALS)
// =========================
function applySelection(modalId) {
  const checked = document.querySelectorAll(`#${modalId} input:checked`);

  let selected = [];
  checked.forEach(cb => {
    selected.push(cb.parentElement.textContent.trim());
  });

  console.log(modalId + " Selected:", selected);

  // close modal
  closeModal(modalId);
}


// =========================
// ✅ EXPERIENCE RANGE
// =========================
const expRange = document.getElementById("expRange");
const expValue = document.getElementById("expValue");

if (expRange && expValue) {
  expValue.textContent = expRange.value;

  expRange.addEventListener("input", function () {
    expValue.textContent = "0 - " + this.value;
  });
}


// =========================
// ✅ TOGGLE FILTER SECTIONS
// =========================
function toggleRole(element) {
  const content = element.nextElementSibling;
  const arrow = element.querySelector("span");

  const isHidden = window.getComputedStyle(content).display === "none";

  if (isHidden) {
    content.style.display = "block";
    arrow.innerHTML = "▼";
  } else {
    content.style.display = "none";
    arrow.innerHTML = "▶";
  }
}


// =========================
// ✅ VIEW MORE / LESS
// =========================
function toggleMore(event) {
  event.stopPropagation();

  const btn = event.target;
  const more = btn.previousElementSibling;

  more.classList.toggle("dash-job-hidden");

  btn.innerText = more.classList.contains("dash-job-hidden")
    ? "View More"
    : "View Less";
}


// =========================
// ✅ CLOSE MODAL ON OUTSIDE CLICK
// =========================
window.onclick = function (e) {
  document.querySelectorAll(".modal").forEach(modal => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
};


// =========================
// ✅ SEARCH FILTER INSIDE MODAL
// =========================
document.querySelectorAll(".modal-search").forEach(input => {
  input.addEventListener("keyup", function () {
    const filter = this.value.toLowerCase();
    const labels = this.parentElement.querySelectorAll(".modal-body label");

    labels.forEach(label => {
      const text = label.textContent.toLowerCase();
      label.style.display = text.includes(filter) ? "" : "none";
    });
  });
});



/* ------------------------------------------------------------------------------------------------------------------------------------- */

                   /*------- Notification header panel silder ---------*/

  // Open notification panel
document.getElementById("notifBox").addEventListener("click", function () {
  document.getElementById("notificationPanel").classList.add("active");
});

// Close panel
function closeNotification() {
  document.getElementById("notificationPanel").classList.remove("active");
}

/*------- Notification header panel silder ---------*/
window.addEventListener("click", function(e) {
  const panel = document.getElementById("notificationPanel");
  const bell = document.getElementById("notifBox");

  if (!panel.contains(e.target) && !bell.contains(e.target)) {
    panel.classList.remove("active");
  }
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */


               /*------- Profile header panel silder ---------*/

// Open panel
document.getElementById("menuBtn").addEventListener("click", function () {
  document.getElementById("profilePanel").classList.add("active");
});

// Close panel
function closeProfilePanel() {
  document.getElementById("profilePanel").classList.remove("active");
}

/*------- Profile header panel silder ---------*/
window.addEventListener("click", function(e) {
  const panel = document.getElementById("profilePanel");
  const menuBtn = document.getElementById("menuBtn");

  if (!panel.contains(e.target) && !menuBtn.contains(e.target)) {
    panel.classList.remove("active");
  }
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */







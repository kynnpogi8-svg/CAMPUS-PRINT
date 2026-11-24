const BUSINESS_EMAIL = "hello@example.com"; // ← change this to your real email

// ============================================
// RATES (all in PHP)
// ============================================
const RATES = {
  // Black & White Printing
  bw: {
    short: 2.0,   // 8.5" × 11"
    long: 2.5,    // 8.5" × 13"
    a4: 2.5
  },
  // Colored Printing
  color: {
    short: 8.0,
    long: 10.0,
    a4: 10.0
  },
  // Photocopy
  photocopy: {
    short: 1.5,
    long: 2.0
  },
  // Lamination
  lamination: {
    short: 15.0,
    long: 20.0,   // Long / A4
    a4: 20.0
  },
  // Photo / Photobooth
  photo: {
    passportId: 80.0,     // Set of 4
    "2r": 120.0,
    groupStrip: 150.0
  },
  // Add-ons
  pdfResize: 20.0,
  // PC Rental
  pc: {
    "30min": 15.0,
    "1hour": 25.0,
    extension15: 10.0
  }
};

document.addEventListener("DOMContentLoaded", () => {

  // ---------- MOBILE NAV ----------
  const menuButton = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      menuButton.textContent = isOpen ? "✕" : "☰";
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        menuButton.textContent = "☰";
      });
    });
  }

  // ---------- FOOTER YEAR ----------
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------- SERVICE FIELDS TOGGLE ----------
  const serviceSelect = document.getElementById("service");

  const serviceGroups = {
    "Rush ID": "rushFields",
    "Printing": "printingFields",
    "Xerox / Photocopy": "xeroxFields",
    "Photo Printing": "photoFields",
    "Scanning": "scanningFields"
  };

  function updateServiceFields() {
    const selectedService = serviceSelect ? serviceSelect.value : "";

    Object.entries(serviceGroups).forEach(([service, groupId]) => {
      const group = document.getElementById(groupId);
      if (!group) return;

      const isActive = selectedService === service;
      group.hidden = !isActive;

      group.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = !isActive;
        field.required = isActive && field.tagName !== "TEXTAREA";
      });
    });

    calculatePrice();
  }

  if (serviceSelect) {
    serviceSelect.addEventListener("change", updateServiceFields);
    updateServiceFields();
  }

  // ---------- PRICE CALCULATION ----------
  function formatPeso(amount) {
    return "₱" + amount.toFixed(2);
  }

  function calculatePrice() {
    const form = document.getElementById("quoteForm");
    if (!form) return { total: 0, breakdown: [] };

    const formData = new FormData(form);
    const service = formData.get("service") || "";
    let total = 0;
    let breakdown = [];

    const getQty = (name) => {
      const val = formData.get(name);
      const num = parseInt(val, 10);
      return isNaN(num) || num < 1 ? 0 : num;
    };

    // ---- RUSH ID / PHOTOBOOTH ----
    if (service === "Rush ID") {
      const size = (formData.get("rushId") || "").toLowerCase();
      // Most ID sizes use the passport/ID set price
      total = RATES.photo.passportId;
      breakdown.push(`Passport / ID Size (Set of 4): ${formatPeso(RATES.photo.passportId)}`);
    }

    // ---- PRINTING ----
    if (service === "Printing") {
      const paperSize = (formData.get("paperSize") || "").toLowerCase();
      const paperType = (formData.get("paperType") || "").toLowerCase();
      const pages = getQty("pages") || 1;

      let rate = RATES.bw.a4; // default

      const isColor = paperType === "color" || paperType.includes("color");

      if (isColor) {
        if (paperSize === "short" || paperSize.includes("letter")) rate = RATES.color.short;
        else if (paperSize === "long" || paperSize === "legal") rate = RATES.color.long;
        else rate = RATES.color.a4;
      } else {
        if (paperSize === "short" || paperSize.includes("letter")) rate = RATES.bw.short;
        else if (paperSize === "long" || paperSize === "legal") rate = RATES.bw.long;
        else rate = RATES.bw.a4;
      }

      total = rate * pages;
      const typeLabel = isColor ? "Colored" : "Black & White";
      const sizeLabel = paperSize || "A4";
      breakdown.push(`${typeLabel} print (${sizeLabel}) × ${pages} page(s): ${formatPeso(rate)} × ${pages} = ${formatPeso(total)}`);
    }

    // ---- XEROX / PHOTOCOPY ----
    if (service === "Xerox / Photocopy") {
      const size = (formData.get("xeroxSize") || "").toLowerCase();
      const copies = getQty("copies") || 1;

      let rate = RATES.photocopy.short;
      if (size === "long" || size === "legal") rate = RATES.photocopy.long;

      total = rate * copies;
      breakdown.push(`Photocopy (${size || "Short"}) × ${copies}: ${formatPeso(rate)} × ${copies} = ${formatPeso(total)}`);
    }

    // ---- PHOTO PRINTING ----
    if (service === "Photo Printing") {
      const photoSize = (formData.get("photoSize") || "").toLowerCase();

      if (photoSize === "passport" || photoSize.includes("id") || photoSize === "2x2") {
        total = RATES.photo.passportId;
        breakdown.push(`Passport / ID Size (Set of 4): ${formatPeso(total)}`);
      } else if (photoSize === "2r") {
        total = RATES.photo["2r"];
        breakdown.push(`2R Single Print: ${formatPeso(total)}`);
      } else if (photoSize === "group") {
        total = RATES.photo.groupStrip;
        breakdown.push(`Group Photo Strip (4 shots): ${formatPeso(total)}`);
      } else {
        // Other sizes (3R, 4R, etc.) – use 2R as base estimate for now
        total = RATES.photo["2r"];
        breakdown.push(`Photo print (${photoSize || "standard"}): ${formatPeso(total)} (estimate)`);
      }
    }

    // ---- SCANNING ----
    if (service === "Scanning") {
      const pages = getQty("pages") || 1;
      // No scanning rate provided yet – show message
      total = 0;
      breakdown.push(`Scanning (${pages} page(s)): rate not set — will be quoted`);
    }

    // Optional PDF Resizing
    if (formData.get("pdfResize") === "on" || formData.get("pdfResize") === "yes") {
      total += RATES.pdfResize;
      breakdown.push(`PDF Resizing & Formatting: ${formatPeso(RATES.pdfResize)}`);
    }

    // ---------- DISPLAY RESULT ----------
    const priceBox = document.getElementById("priceEstimate");
    const breakdownEl = document.getElementById("priceBreakdown");
    const totalEl = document.getElementById("priceTotal");

    if (priceBox && breakdownEl && totalEl) {
      if (service && (total > 0 || breakdown.length > 0)) {
        priceBox.hidden = false;
        breakdownEl.innerHTML = breakdown.map(line => `<li>${line}</li>`).join("");
        totalEl.textContent = total > 0 ? formatPeso(total) : "To be quoted";
      } else {
        priceBox.hidden = true;
      }
    }

    return { total, breakdown };
  }

  // Live calculation
  const quoteForm = document.getElementById("quoteForm");
  if (quoteForm) {
    quoteForm.addEventListener("input", calculatePrice);
    quoteForm.addEventListener("change", calculatePrice);
  }

  // ---------- FORM SUBMIT ----------
  if (quoteForm) {
    quoteForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(quoteForm);
      const name = formData.get("name");
      const email = formData.get("email");
      const service = formData.get("service");
      const message = formData.get("message") || "";

      const { total, breakdown } = calculatePrice();

      const fieldLabels = {
        rushId: "ID / Photo Size",
        paperSize: "Paper Size",
        paperType: "Print Type",
        xeroxSize: "Xerox Paper Size",
        copies: "Number of Copies",
        photoSize: "Photo Size",
        photoType: "Photo Paper Type",
        pages: "Number of Pages"
      };

      let serviceDetails = "";
      Object.entries(fieldLabels).forEach(([field, label]) => {
        const value = formData.get(field);
        if (value) serviceDetails += `${label}: ${value}\n`;
      });

      const subject = encodeURIComponent(`Campus Print Hub – Quotation Request from ${name}`);

      const body = encodeURIComponent(
`CAMPUS PRINT HUB — QUOTATION REQUEST

Customer Name: ${name}
Customer Email: ${email}

Selected Service: ${service}

SERVICE SPECIFICATIONS:
${serviceDetails || "No additional specifications provided."}

ESTIMATED TOTAL: ${total > 0 ? "₱" + total.toFixed(2) : "To be quoted"}
${breakdown.length ? "\nBreakdown:\n• " + breakdown.join("\n• ") : ""}

PROJECT DETAILS / NOTES:
${message || "—"}

Thank you for choosing Campus Print Hub!
PRINT • COPY • BIND • DESIGN`
      );

      const formNote = document.getElementById("formNote");

      if (BUSINESS_EMAIL === "hello@example.com") {
        formNote.textContent = "Please set your real business email in script.js before submitting.";
        formNote.style.color = "#6e0707";
        return;
      }

      window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;
      formNote.textContent = "Your inquiry is ready! Please send the email using your email application.";
      formNote.style.color = "#2e7d32";
    });
  }

  // Initial run
  calculatePrice();
});

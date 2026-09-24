/* GYM ERP desktop UI — no-build vanilla JS single-page app. */

const app = document.getElementById("app");

const state = {
  token: localStorage.getItem("gym_erp_token") || null,
  me: null,
  permissions: JSON.parse(localStorage.getItem("gym_erp_permissions") || "[]"),
  currency: "PKR",
};

/* ---------------- helpers ---------------- */

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  try { localStorage.setItem("gym_erp_theme", theme); } catch (_) { /* noop */ }
}

function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

function toast(message, kind = "info", timeoutMs = 3600) {
  const root = document.getElementById("toast-root");
  if (!root) {
    alert(message);
    return;
  }
  const el = document.createElement("div");
  const icons = { success: "✓", warn: "!", danger: "✕", info: "ℹ" };
  el.className = `toast ${kind}`;
  el.setAttribute("role", kind === "danger" ? "alert" : "status");
  el.innerHTML = `<span class="toast-icon">${icons[kind] || icons.info}</span><span>${esc(message)}</span>`;
  root.appendChild(el);
  const remove = () => {
    if (!el.isConnected) return;
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 220);
  };
  el.addEventListener("click", remove);
  setTimeout(remove, timeoutMs);
  return remove;
}

function spinner(small) {
  return `<span class="spinner"${small ? ' style="width:12px;height:12px;border-width:2px"' : ""} aria-hidden="true"></span>`;
}

function titleCase(label) {
  return String(label ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function money(minor) {
  const major = (minor || 0) / 100;
  return `${state.currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function openWhatsAppReceipt(member, result, plan, amountMinor, endDate) {
  const rawPhone = String(member?.phone || member?.whatsapp || "").trim();
  if (!rawPhone) {
    alert("Receipt created successfully, but this member has no phone number. Add a phone number to send it on WhatsApp.");
    return;
  }
  let phone = rawPhone.replace(/[^\d+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("0")) phone = `+92${phone.slice(1)}`;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) {
    alert("Receipt created successfully, but the member phone number is not valid for WhatsApp.");
    return;
  }
  const message = [
    `GYM receipt ${result.receiptNumber || ""}`.trim(),
    `Member: ${member.full_name || "Member"}`,
    member.member_code ? `Member code: ${member.member_code}` : "",
    `Plan: ${plan?.name || "Membership"}`,
    `Amount: ${money(amountMinor)}`,
    endDate ? `Valid until: ${endDate}` : "",
    "A professional receipt image is ready in GYM ERP. Thank you for choosing our gym.",
  ].filter(Boolean).join("\n");
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function receiptSvg(member, result, plan, amountMinor, endDate) {
  const escXml = (value) => esc(value).replaceAll("'", "&apos;");
  const gymName = state.gymName || "GYM ERP";
  const rows = [
    ["Member", member.full_name || "Member"],
    ["Member code", member.member_code || "—"],
    ["Phone", member.phone || member.whatsapp || "—"],
    ["Plan", plan?.name || "Membership"],
    ["Valid until", endDate || "—"],
    ["Payment method", String(result.methodCode || "—").replaceAll("_", " ")],
    ["Receipt no.", result.receiptNumber || "—"],
  ];
  const rowSvg = rows.map(([label, value], index) => {
    const y = 400 + index * 46;
    return `<text x="76" y="${y}" class="label">${escXml(label)}</text><text x="824" y="${y}" text-anchor="end" class="value">${escXml(value)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs><linearGradient id="header" x1="0" x2="1"><stop stop-color="#145c49"/><stop offset="1" stop-color="#2d9270"/></linearGradient></defs>
    <rect width="900" height="1200" rx="34" fill="#f5f8f6"/>
    <rect x="28" y="28" width="844" height="1144" rx="28" fill="#fff" stroke="#d6ded8" stroke-width="2"/>
    <rect x="28" y="28" width="844" height="260" rx="28" fill="url(#header)"/>
    <text x="76" y="112" fill="#fff" font-family="Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="3">GYM RECEIPT</text>
    <text x="76" y="175" fill="#fff" font-family="Arial,sans-serif" font-size="42" font-weight="700">${escXml(gymName)}</text>
    <text x="76" y="220" fill="#d9f4e8" font-family="Arial,sans-serif" font-size="20">Membership payment confirmation</text>
    <text x="76" y="338" fill="#145c49" font-family="Arial,sans-serif" font-size="25" font-weight="700">MEMBER DETAILS</text>
    <line x1="76" y1="360" x2="824" y2="360" stroke="#d6ded8" stroke-width="2"/>
    ${rowSvg}
    <rect x="76" y="760" width="748" height="170" rx="20" fill="#e4f3ec"/>
    <text x="112" y="820" fill="#145c49" font-family="Arial,sans-serif" font-size="24" font-weight="700">TOTAL PAID</text>
    <text x="112" y="885" fill="#145c49" font-family="Arial,sans-serif" font-size="48" font-weight="700">${escXml(money(amountMinor))}</text>
    <text x="76" y="1010" fill="#66776c" font-family="Arial,sans-serif" font-size="20">Thank you for choosing ${escXml(gymName)}.</text>
    <text x="76" y="1050" fill="#66776c" font-family="Arial,sans-serif" font-size="18">Keep this receipt for your membership records.</text>
    <text x="76" y="1118" fill="#98a2a0" font-family="Arial,sans-serif" font-size="16">Generated by GYM ERP · ${escXml(new Date().toLocaleString())}</text>
  </svg>`;
}

function receiptDataUrl(member, result, plan, amountMinor, endDate) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(receiptSvg(member, result, plan, amountMinor, endDate))}`;
}

async function receiptPng(member, result, plan, amountMinor, endDate) {
  const svgUrl = receiptDataUrl(member, result, plan, amountMinor, endDate);
  const image = new Image();
  image.src = svgUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Could not create the receipt image."));
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 2400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the receipt image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not export the receipt image.");
  return {
    blob,
    url: URL.createObjectURL(blob),
    fileName: `gym-receipt-${result.receiptNumber || "membership"}.png`,
  };
}

async function showReceiptActions(member, result, plan, amountMinor, endDate) {
  const fallbackUrl = receiptDataUrl(member, result, plan, amountMinor, endDate);
  const modal = openModal(`
    <h2>Member setup complete</h2>
    <p class="muted" id="receipt-image-status">Creating PNG receipt image…</p>
    <img src="${fallbackUrl}" alt="Professional membership receipt" class="receipt-preview" />
    <div class="actions">
      <button type="button" class="btn" id="receipt-later">Close</button>
      <button type="button" class="btn" id="download-receipt" disabled>Download PNG receipt</button>
      <button type="button" class="btn" id="share-receipt" disabled>Share PNG to WhatsApp</button>
      <button type="button" class="btn primary" id="send-receipt-whatsapp">Send receipt to WhatsApp</button>
    </div>`);
  let image = null;
  const send = () => openWhatsAppReceipt(member, result, plan, amountMinor, endDate);
  modal.querySelector("#send-receipt-whatsapp").addEventListener("click", () => {
    send();
  });
  modal.querySelector("#receipt-later").addEventListener("click", () => modal.remove());
  modal.querySelector("#download-receipt").addEventListener("click", () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = image.fileName;
    link.click();
  });
  modal.querySelector("#share-receipt").addEventListener("click", async () => {
    if (!image || !navigator.share) {
      toast("Image sharing is not supported here. Download the PNG receipt instead.", "warn");
      return;
    }
    try {
      const file = new File([image.blob], image.fileName, { type: "image/png" });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error("File sharing is not supported.");
      await navigator.share({ title: `GYM receipt ${result.receiptNumber || ""}`, text: "Membership receipt", files: [file] });
    } catch {
      toast("Image sharing was cancelled or is not supported here. Download the PNG receipt instead.", "warn");
    }
  });
  try {
    image = await receiptPng(member, result, plan, amountMinor, endDate);
    const preview = modal.querySelector(".receipt-preview");
    preview.src = image.url;
    modal.querySelector("#receipt-image-status").textContent = "PNG receipt ready. Share it directly to WhatsApp or download it.";
    modal.querySelector("#download-receipt").disabled = false;
    modal.querySelector("#share-receipt").disabled = false;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = image.fileName;
    link.click();
  } catch (error) {
    modal.querySelector("#receipt-image-status").textContent = error.message;
  }
  // Keep the existing automatic WhatsApp redirect for desktop browsers.
  send();
}

function can(permission) {
  return state.permissions.includes(permission);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && path !== "/api/login") {
    logoutLocal();
    throw new Error("Please sign in again.");
  }
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof data === "object" && data?.message ? data.message : "Request failed");
  return data;
}

function badge(text) {
  if (!text) return "";
  const kind = ["active", "paid", "synced", "healthy", "check_in"].includes(text)
    ? text
    : ["pending", "partial", "warning"].includes(text)
      ? "pending"
      : "expired";
  return `<span class="badge ${kind}">${esc(text.replaceAll("_", " "))}</span>`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function logoutLocal() {
  localStorage.removeItem("gym_erp_token");
  localStorage.removeItem("gym_erp_permissions");
  state.token = null;
  state.me = null;
  render();
}

function openModal(html) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);
  return backdrop;
}

function cameraAccessError(error) {
  if (!window.isSecureContext) {
    return new Error("Camera access is blocked because this mobile page is using HTTP. Open GYM ERP through HTTPS (or use the desktop computer at http://localhost:5178). Mobile browsers require HTTPS before they will show the camera permission prompt.");
  }
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
    return new Error("Camera permission was denied. Tap the lock/site icon in the browser address bar, set Camera to Allow, then reload GYM ERP. Also check the phone's Settings > Browser > Camera permission.");
  }
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return new Error("No camera was found on this device. Connect a camera, close other apps using it, and try again.");
  }
  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return new Error("The camera is busy or unavailable. Close other camera apps, then reload GYM ERP and try again.");
  }
  return new Error("This browser could not start the camera. Use a current Chrome, Edge, or Safari browser, allow camera permission, and reload GYM ERP.");
}

async function requestCamera(constraints) {
  if (!navigator.mediaDevices?.getUserMedia) throw cameraAccessError();
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    throw cameraAccessError(error);
  }
}

async function listCameras() {
  const all = await navigator.mediaDevices.enumerateDevices();
  const cams = all.filter((d) => d.kind === "videoinput");
  const seen = new Set();
  const deduped = [];
  for (const cam of cams) {
    const key = cam.deviceId || `${cam.label}|${cam.groupId || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(cam);
  }
  return deduped;
}

function populateCameraSelect(selectElement, cameras, preferredDeviceId) {
  selectElement.innerHTML = "";
  if (cameras.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Default camera";
    selectElement.appendChild(opt);
    return;
  }
  cameras.forEach((camera, index) => {
    const option = document.createElement("option");
    option.value = camera.deviceId || "";
    option.textContent = camera.label || `Camera ${index + 1}`;
    if (preferredDeviceId && camera.deviceId && preferredDeviceId === camera.deviceId) option.selected = true;
    selectElement.appendChild(option);
  });
  if (!preferredDeviceId && selectElement.options.length > 0 && !selectElement.value) {
    selectElement.selectedIndex = 0;
  }
}

function videoConstraintsFor(deviceId, preferred = { width: 960, height: 720 }) {
  const base = {
    width: { ideal: preferred.width },
    height: { ideal: preferred.height },
  };
  if (deviceId) base.deviceId = { exact: deviceId };
  return base;
}

async function captureFace() {
  if (!window.isSecureContext) throw cameraAccessError();
  const backdrop = openModal(`
    <h2>Camera capture</h2>
    <p id="face-quality" class="muted">Preparing camera… allow permission when prompted.</p>
    <label>Camera</label><select id="face-camera" aria-label="Camera"><option value="">Requesting cameras…</option></select>
    <video id="face-video" autoplay playsinline muted style="width:100%;max-height:360px;background:#111;border-radius:8px"></video>
    <canvas id="face-canvas" width="320" height="240" hidden></canvas>
    <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button type="button" class="btn" id="capture">Capture now</button></div>`);
  const video = backdrop.querySelector("#face-video");
  const canvas = backdrop.querySelector("#face-canvas");
  const qualityLabel = backdrop.querySelector("#face-quality");
  const cameraSelect = backdrop.querySelector("#face-camera");
  let stream = null;
  let currentDeviceId = "";
  const closeStream = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  };
  const startCamera = async (deviceId) => {
    closeStream();
    stream = await requestCamera({ video: videoConstraintsFor(deviceId), audio: false });
    currentDeviceId = deviceId || "";
    const [track] = stream.getVideoTracks();
    const capabilities = track?.getCapabilities?.() || {};
    if (capabilities.deviceId && !cameraSelect.querySelector(`option[value="${capabilities.deviceId}"]`)) {
      const cams = await listCameras();
      populateCameraSelect(cameraSelect, cams, capabilities.deviceId);
    } else if (capabilities.deviceId && cameraSelect.value !== capabilities.deviceId) {
      const match = cameraSelect.querySelector(`option[value="${capabilities.deviceId}"]`);
      if (match) match.selected = true;
    }
    try { video.srcObject = stream; } catch (_) { video.srcObject = null; }
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Camera timed out.")), 6000);
      video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
    });
    try { await video.play(); } catch (_) { /* autoplay playsinline handles it */ }
  };
  try {
    await startCamera("");
    const camsAfterPermission = await listCameras();
    const activeTrack = stream?.getVideoTracks()[0];
    const activeId = activeTrack?.getSettings?.()?.deviceId || currentDeviceId;
    populateCameraSelect(cameraSelect, camsAfterPermission, activeId || undefined);
    qualityLabel.textContent = "Position one member's face inside the frame. Capturing automatically when the image is clear…";
  } catch (error) {
    closeStream();
    backdrop.remove();
    throw error;
  }
  cameraSelect.addEventListener("change", async () => {
    const target = cameraSelect.value || "";
    if (target === currentDeviceId) return;
    qualityLabel.textContent = "Switching camera…";
    try {
      await startCamera(target);
      qualityLabel.textContent = "Position one member's face inside the frame. Capturing automatically when the image is clear…";
    } catch (switchError) {
      qualityLabel.textContent = switchError.message;
      toast(switchError.message, "warn");
    }
  });
  return new Promise((resolve, reject) => {
    let previous = null;
    let stableFrames = 0;
    let finished = false;
    const sample = () => {
      if (!video.isConnected) return;
      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (_) {
        return;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      let totalSquared = 0;
      let sharpness = 0;
      let difference = 0;
      const current = new Uint8Array(Math.ceil(pixels.length / 4));
      for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
        const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        current[p] = luminance;
        total += luminance;
        totalSquared += luminance * luminance;
        if (p > 0) sharpness += Math.abs(luminance - current[p - 1]);
        if (previous) difference += Math.abs(luminance - previous[p]);
      }
      const count = current.length;
      const average = total / count;
      const contrast = Math.sqrt(Math.max(0, totalSquared / count - average * average));
      const edgeStrength = sharpness / count;
      const frameDifference = previous ? difference / count : 999;
      previous = current;
      const brightEnough = average >= 40 && average <= 225;
      const clearEnough = contrast >= 18 && edgeStrength >= 5;
      const stableEnough = frameDifference < 15;
      if (brightEnough && clearEnough && stableEnough) stableFrames += 1;
      else stableFrames = 0;
      qualityLabel.textContent = stableFrames >= 3
        ? "Clear image found. Capturing…"
        : `Hold still… brightness ${Math.round(average)} · sharpness ${Math.round(edgeStrength)} · stability ${stableFrames}`;
      if (stableFrames >= 3) finishCapture(ctx);
    };
    const close = () => { closeStream(); backdrop.remove(); };
    const finishCapture = (ctx) => {
      if (finished) return;
      finished = true;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bytes = new Uint8Array(image.data);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const photoBase64 = canvas.toDataURL("image/jpeg", 0.88);
      close();
      resolve({ width: canvas.width, height: canvas.height, rgbaBase64: btoa(binary), photoBase64 });
    };
    backdrop.querySelector("#cancel").addEventListener("click", () => { close(); reject(new Error("Camera capture cancelled.")); });
    backdrop.querySelector("#capture").addEventListener("click", () => {
      const ctx = canvas.getContext("2d");
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (_) {
        toast("Camera not ready. Wait a moment then try again.", "warn");
        return;
      }
      finishCapture(ctx);
    });
    const timer = setInterval(() => {
      if (finished) { clearInterval(timer); return; }
      sample();
    }, 260);
  });
}

function showFaceMember(data) {
  const m = data.member;
  const membership = data.activeMembership;
  const todayMs = Date.parse(today());
  const daysLeft = membership ? Math.max(0, Math.ceil((Date.parse(membership.end_date) - todayMs) / 86400000)) : 0;
  openModal(`
    <h2>Member recognized</h2>
    <div style="display:flex;gap:16px;align-items:flex-start">
      ${data.photoDataUrl ? `<img src="${esc(data.photoDataUrl)}" alt="Member photo" style="width:120px;height:140px;object-fit:cover;border-radius:8px;background:#eee" />` : `<div class="card">No photo</div>`}
      <div>
        <h2>${esc(m.full_name)}</h2>
        <div class="list-item"><span class="muted">Member code</span><b>${esc(m.member_code)}</b></div>
        <div class="list-item"><span class="muted">Membership</span><span>${membership ? `${esc(membership.plan_name)} · ${daysLeft} days left` : "Expired / not enrolled"}</span></div>
        <div class="list-item"><span class="muted">Total months</span><span>${membership ? `${Math.max(1, Math.round((Date.parse(membership.end_date) - Date.parse(membership.start_date)) / 2592000000))} months` : "—"}</span></div>
        <div class="list-item"><span class="muted">Weight</span><span>${m.weight_kg ? `${m.weight_kg} kg` : "—"}</span></div>
        <div class="list-item"><span class="muted">Phone</span><span>${esc(m.phone || "—")}</span></div>
      </div>
    </div>
    <div class="actions"><button type="button" class="btn primary" onclick="this.closest('.modal-backdrop').remove()">Done</button></div>`);
}

async function liveFaceScanner() {
  if (!window.isSecureContext) throw cameraAccessError();
  const backdrop = openModal(`
    <div class="scanner-header"><div><span class="eyebrow">LIVE CHECK-IN</span><h2>Recognizing members</h2><p id="scanner-status" class="muted">Preparing camera… allow permission when prompted.</p></div><span class="scanner-pulse" id="scanner-pulse">● Starting</span></div>
    <div class="scanner-stage"><video id="scanner-video" autoplay playsinline muted></video><div class="scanner-frame"><i></i><i></i><i></i><i></i><span>Align face here</span></div></div>
    <label>Camera</label><select id="scanner-camera"><option value="">Requesting cameras…</option></select>
    <div class="scanner-footer"><span class="muted">Keep one face in frame and hold still</span><button type="button" class="btn" id="scanner-close">Close</button></div>`);
  const video = backdrop.querySelector("#scanner-video");
  const pulse = backdrop.querySelector("#scanner-pulse");
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 240;
  const select = backdrop.querySelector("#scanner-camera");
  const status = backdrop.querySelector("#scanner-status");
  let stream = null;
  let currentDeviceId = "";
  let busy = false;
  let closed = false;
  let timer = null;
  const closeStream = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

  };
  const start = async (deviceId) => {
    closeStream();
    stream = await requestCamera({ video: videoConstraintsFor(deviceId), audio: false });
    currentDeviceId = deviceId || "";
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings?.() || {};
    if (settings.deviceId) {
      const existing = select.querySelector(`option[value="${settings.deviceId}"]`);
      if (!existing) {
        const cams = await listCameras();
        populateCameraSelect(select, cams, settings.deviceId);
      } else if (select.value !== settings.deviceId) {
        existing.selected = true;
      }
    }
    try { video.srcObject = stream; } catch (_) { video.srcObject = null; }
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Camera timed out.")), 6000);
      video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
    });
    try { await video.play(); } catch (_) { /* autoplay */ }
    if (pulse) pulse.textContent = "● Live";
  };
  const close = () => {
    closed = true;
    if (timer) clearInterval(timer);
    closeStream();
    backdrop.remove();
  };
  try {
    await start("");
    const cams = await listCameras();
    const activeId = stream?.getVideoTracks()[0]?.getSettings?.()?.deviceId || currentDeviceId;
    populateCameraSelect(select, cams, activeId || undefined);
    status.textContent = "Look at the camera. Recognition starts automatically.";
  } catch (error) {
    close();
    throw error;
  }
  select.addEventListener("change", async () => {
    const target = select.value || "";
    if (target === currentDeviceId) return;
    status.textContent = "Switching camera…";
    try {
      await start(target);
      status.textContent = "Look at the camera. Recognition starts automatically.";
    } catch (switchError) {
      status.textContent = switchError.message;
      toast(switchError.message, "warn");
    }
  });
  backdrop.querySelector("#scanner-close").addEventListener("click", close);
  timer = setInterval(async () => {
    if (closed || busy || video.readyState < 2) return;
    busy = true;
    if (pulse) pulse.textContent = "⟳ Scanning";
    const context = canvas.getContext("2d");
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (_) {
      busy = false;
      return;
    }
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    let binary = "";
    const bytes = new Uint8Array(image.data);
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    try {
      status.textContent = "Checking face…";
      const result = await api("/api/face/identify", { method: "POST", body: { width: canvas.width, height: canvas.height, rgbaBase64: btoa(binary), photoBase64: canvas.toDataURL("image/jpeg", 0.88) } });
      close();
      showFaceMember(result);
    } catch (error) {
      if (!closed && !String(error.message).toLowerCase().includes("no face")) status.textContent = error.message;
      if (pulse && !closed) pulse.textContent = "● Live";
    } finally {
      busy = false;
    }
  }, 1400);
}

async function liveFingerprintScanner() {
  const backdrop = openModal(`
    <div class="scanner-header"><div><span class="eyebrow">LIVE CHECK-IN</span><h2>Fingerprint scanner</h2><p id="fingerprint-status" class="muted">Place a registered finger on the scanner.</p></div><span class="scanner-pulse">● Live</span></div>
    <div class="card"><p class="muted">The scanner is optional. Close this window to stop listening.</p></div>
    <div class="actions"><button type="button" class="btn" id="fingerprint-close">Close</button></div>`);
  let closed = false;
  let busy = false;
  const status = backdrop.querySelector("#fingerprint-status");
  const close = () => {
    closed = true;
    backdrop.remove();
  };
  backdrop.querySelector("#fingerprint-close").addEventListener("click", close);
  while (!closed) {
    if (busy) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      continue;
    }
    busy = true;
    try {
      const result = await api("/api/fingerprint/identify", { method: "POST" });
      close();
      showFaceMember(result);
    } catch (error) {
      if (!closed && !String(error.message).toLowerCase().includes("no registered")) status.textContent = error.message;
    } finally {
      busy = false;
    }
    if (!closed) await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

/* ---------------- router ---------------- */

const routes = {
  dashboard: viewDashboard,
  members: viewMembers,
  member: viewMemberDetail,
  memberships: viewMemberships,
  attendance: viewAttendance,
  payments: viewPayments,
  expenses: viewExpenses,
  income: viewIncome,
  staff: viewStaff,
  reports: viewReports,
  backups: viewBackups,
  equipment: viewEquipment,
  audit: viewAudit,
  diagnostics: viewDiagnostics,
  settings: viewSettings,
};

function navItems() {
  const items = [
    { id: "dashboard", label: "Dashboard", perm: null },
    { id: "attendance", label: "Attendance", perm: "attendance.write" },
    { id: "members", label: "Members", perm: "members.read" },
    { id: "memberships", label: "Memberships", perm: "members.read" },
    { id: "payments", label: "Payments", perm: "payments.read" },
    { id: "expenses", label: "Expenses", perm: "expenses.read" },
    { id: "income", label: "Income", perm: "expenses.read" },
    { id: "staff", label: "Staff", perm: "staff.manage" },
    { id: "reports", label: "Reports", perm: "reports.read" },
    { id: "backups", label: "Backups", perm: "backups.manage" },
    { id: "equipment", label: "Equipment", perm: "diagnostics.read" },
    { id: "audit", label: "Audit log", perm: "audit.read" },
    { id: "diagnostics", label: "Diagnostics", perm: "diagnostics.read" },
    { id: "settings", label: "Settings", perm: null },
  ];
  return items.filter((item) => !item.perm || can(item.perm));
}

function navigate(route, param) {
  location.hash = param ? `#/${route}/${param}` : `#/${route}`;
}

function currentRoute() {
  const parts = location.hash.replace(/^#\//, "").split("/");
  return { view: parts[0] || "dashboard", param: parts[1] || null };
}

/* ---------------- shell ---------------- */

async function render() {
  if (!state.token) {
    const status = await fetch("/api/status").then((r) => r.json()).catch(() => ({ setupComplete: false }));
    if (status.setupComplete) return renderLogin();
    return renderSetup();
  }
  if (!state.me) {
    try {
      const me = await api("/api/me");
      state.me = me.user;
      state.currency = me.gym?.currencyCode || "PKR";
      state.gymName = me.gym?.name || "GYM ERP";
    } catch {
      return;
    }
  }
  renderShell();
}

function renderLogin(message) {
  app.innerHTML = `
  <div class="center-screen">
    <div class="card auth-card">
      <div class="auth-logo"><span class="dot">G</span></div>
      <h1 style="text-align:center">Welcome back</h1>
      <p class="muted" style="text-align:center;margin-bottom:20px">Sign in to manage your gym.</p>
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
        <button type="button" class="btn small ghost theme-toggle" id="top-theme" title="Toggle light/dark mode">${currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
      </div>
      ${message ? `<div class="error-box">${esc(message)}</div>` : ""}
      <form id="login-form">
        <label>Username</label>
        <input name="username" autocomplete="username" required autofocus />
        <label>Password</label>
        <div class="field-wrap">
          <input name="password" type="password" autocomplete="current-password" required />
          <button type="button" class="toggle-pass" data-target='{"name":"password"}'>Show</button>
        </div>
        <button class="btn primary" style="width:100%;margin-top:18px;justify-content:center">Sign in</button>
      </form>
    </div>
  </div>`;
  const topBtn = document.getElementById("top-theme");
  if (topBtn) topBtn.addEventListener("click", () => { toggleTheme(); topBtn.textContent = currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"; });
  wirePasswordToggles(app);
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button.primary");
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${spinner(true)} Signing in…`;
    const form = new FormData(e.target);
    try {
      const result = await api("/api/login", {
        method: "POST",
        body: { username: form.get("username"), password: form.get("password") },
      });
      state.token = result.token;
      state.permissions = result.permissions;
      localStorage.setItem("gym_erp_token", result.token);
      localStorage.setItem("gym_erp_permissions", JSON.stringify(result.permissions));
      toast("Signed in successfully.", "success");
      render();
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      renderLogin(error.message);
    }
  });
}

function wirePasswordToggles(scope) {
  scope.querySelectorAll(".toggle-pass").forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      let targetName = null;
      try { targetName = JSON.parse(btn.dataset.target || "{}").name; } catch (_) { /* noop */ }
      const input = targetName
        ? scope.querySelector(`input[name="${targetName}"]`)
        : btn.parentElement?.querySelector("input");
      if (!input) return;
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.textContent = isPass ? "Hide" : "Show";
    });
  });
}

function renderSetup() {
  let step = 1;
  const data = { gymName: "", ownerName: "", username: "", password: "", currencyCode: "PKR", plans: [] };

  function draw() {
    const stepsHtml = `<div class="steps">${[1, 2, 3].map((n) => `<span class="${n <= step ? "on" : ""}"></span>`).join("")}</div>`;
    if (step === 1) {
      app.innerHTML = `
      <div class="center-screen"><div class="card auth-card">
        <div class="auth-logo"><span class="dot">G</span></div>
        <h1 style="text-align:center">Set up your gym</h1>
        <p class="muted" style="text-align:center;margin-bottom:10px">Step 1 of 3 — gym details</p>
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
          <button type="button" class="btn small ghost theme-toggle" id="setup-theme">${currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        </div>
        ${stepsHtml}
        <form id="s1">
          <label>Gym name</label><input name="gymName" required value="${esc(data.gymName)}" />
          <label>Owner name</label><input name="ownerName" required value="${esc(data.ownerName)}" />
          <label>Currency</label>
          <select name="currencyCode">
            <option value="PKR">PKR — Pakistani Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound</option>
            <option value="AED">AED — Dirham</option>
            <option value="INR">INR — Rupee</option>
          </select>
          <button class="btn primary" style="width:100%;margin-top:18px;justify-content:center">Continue</button>
        </form>
      </div></div>`;
      const st = document.getElementById("setup-theme");
      if (st) st.addEventListener("click", () => { toggleTheme(); draw(); });
      document.getElementById("s1").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        data.gymName = form.get("gymName");
        data.ownerName = form.get("ownerName");
        data.currencyCode = form.get("currencyCode");
        step = 2;
        draw();
      });
    } else if (step === 2) {
      app.innerHTML = `
      <div class="center-screen"><div class="card auth-card">
        <h1 style="text-align:center">Admin account</h1>
        <p class="muted" style="text-align:center;margin-bottom:10px">Step 2 of 3 — your login</p>
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
          <button type="button" class="btn small ghost theme-toggle" id="setup-theme">${currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        </div>
        ${stepsHtml}
        <form id="s2">
          <label>Username</label><input name="username" required minlength="3" value="${esc(data.username)}" />
          <label>Password</label>
          <div class="field-wrap">
            <input name="password" type="password" required minlength="8" />
            <button type="button" class="toggle-pass" data-target='{"name":"password"}'>Show</button>
          </div>
          <p class="muted">Use at least 8 characters. Remember this — it unlocks everything.</p>
          <button class="btn primary" style="width:100%;margin-top:18px;justify-content:center">Continue</button>
        </form>
      </div></div>`;
      wirePasswordToggles(app);
      const st = document.getElementById("setup-theme");
      if (st) st.addEventListener("click", () => { toggleTheme(); draw(); });
      document.getElementById("s2").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        data.username = form.get("username");
        data.password = form.get("password");
        step = 3;
        draw();
      });
    } else {
      app.innerHTML = `
      <div class="center-screen"><div class="card auth-card">
        <h1 style="text-align:center">Membership plans</h1>
        <p class="muted" style="text-align:center;margin-bottom:10px">Step 3 of 3 — optional, you can add plans later</p>
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
          <button type="button" class="btn small ghost theme-toggle" id="setup-theme">${currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        </div>
        ${stepsHtml}
        <div id="plan-list"></div>
        <form id="add-plan" class="form-row" style="align-items:end">
          <div><label>Plan name</label><input name="name" placeholder="Monthly" required /></div>
          <div><label>Price (${esc(data.currencyCode)})</label><input name="price" type="number" min="0" step="0.01" required /></div>
          <div><label>Duration (days)</label><input name="duration" type="number" min="1" value="30" required /></div>
          <div style="display:flex;align-items:flex-end"><button class="btn" type="submit">Add plan</button></div>
        </form>
        <button class="btn primary" id="finish" style="width:100%;margin-top:20px;justify-content:center">Finish setup</button>
      </div></div>`;
      const st = document.getElementById("setup-theme");
      if (st) st.addEventListener("click", () => { toggleTheme(); draw(); });
      const drawPlans = () => {
        document.getElementById("plan-list").innerHTML =
          data.plans.map((p, i) => `<div class="list-item"><span>${esc(p.name)} — ${esc(data.currencyCode)} ${(p.priceMinor / 100).toFixed(2)} / ${p.durationDays}d</span><button class="btn small danger" data-i="${i}">Remove</button></div>`).join("") ||
          `<p class="muted">No plans added yet.</p>`;
        document.querySelectorAll("#plan-list button").forEach((btn) =>
          btn.addEventListener("click", () => {
            data.plans.splice(Number(btn.dataset.i), 1);
            drawPlans();
          }),
        );
      };
      drawPlans();
      document.getElementById("add-plan").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        data.plans.push({
          name: form.get("name"),
          priceMinor: Math.round(Number(form.get("price")) * 100),
          durationDays: Number(form.get("duration")),
        });
        e.target.reset();
        drawPlans();
      });
      const finishButton = document.getElementById("finish");
      finishButton.addEventListener("click", async () => {
        const original = finishButton.innerHTML;
        finishButton.disabled = true;
        finishButton.innerHTML = `${spinner(true)} Setting up…`;
        try {
          const result = await api("/api/setup", { method: "POST", body: { ...data } });
          const login = await api("/api/login", { method: "POST", body: { username: data.username, password: data.password } });
          state.token = login.token;
          state.permissions = login.permissions;
          localStorage.setItem("gym_erp_token", login.token);
          localStorage.setItem("gym_erp_permissions", JSON.stringify(login.permissions));
          void result;
          toast("Gym setup complete. Welcome!", "success");
          render();
        } catch (error) {
          finishButton.disabled = false;
          finishButton.innerHTML = original;
          toast(error.message, "danger");
        }
      });
    }
  }
  draw();
}

function renderShell() {
  const route = currentRoute();
  const items = navItems();
  const mobileItems = [
    items.find((item) => item.id === "dashboard"),
    items.find((item) => item.id === "attendance"),
    items.find((item) => item.id === "members"),
    { id: "scan", label: "Scan", href: "#/members/scan" },
    items.find((item) => item.id === "payments"),
    { id: "more", label: "More", href: "#/settings" },
  ].filter(Boolean).slice(0, 5);
  app.innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="brand"><span class="dot">G</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(state.gymName || "GYM ERP")}</span></div>
      <nav>
        ${items.map((item) => `<a href="#/${item.id}" class="${route.view === item.id || (route.view === "member" && item.id === "members") ? "active" : ""}"><span aria-hidden="true">${item.id === "dashboard" ? "▦" : item.id === "attendance" ? "◷" : item.id === "members" ? "◉" : item.id === "memberships" ? "▤" : item.id === "payments" ? "৳" : item.id === "expenses" ? "₋" : item.id === "income" ? "₊" : item.id === "staff" ? "♟" : item.id === "reports" ? "▦" : item.id === "backups" ? "⌂" : item.id === "equipment" ? "⚙" : item.id === "audit" ? "❆" : item.id === "diagnostics" ? "✚" : "⋯"}</span>${esc(item.label)}</a>`).join("")}
      </nav>
      <div class="tool-row">
        <button type="button" class="btn small ghost" style="color:#c6d5cf;flex:1" id="sidebar-theme" title="Toggle theme">${currentTheme() === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
      </div>
      <div class="foot">
        Signed in as <b>${esc(state.me.fullName)}</b> (${esc(state.me.role)})
        <button class="btn small" id="logout" style="margin-top:10px;width:100%;justify-content:center">Sign out</button>
      </div>
    </aside>
    <main class="main" id="view"><p class="muted">Loading…</p></main>
    <nav class="mobile-nav" aria-label="Mobile navigation">
      ${mobileItems.map((item) => {
        const active = item.id === "scan" ? route.view === "members" && route.param === "scan"
          : item.id === "members" ? route.view === "members" || route.view === "member"
            : item.id === "attendance" ? route.view === "attendance"
              : item.id === "more" ? !["dashboard", "members", "member", "payments", "attendance"].includes(route.view)
                : route.view === item.id;
        const href = item.href || `#/${item.id}`;
        const icon = item.id === "dashboard" ? "▦" : item.id === "attendance" ? "◷" : item.id === "members" ? "◉" : item.id === "payments" ? "৳" : item.id === "scan" ? "⌾" : "⋯";
        return `<button type="button" class="mobile-nav-link ${active ? "active" : ""}" data-mobile-route="${esc(href)}"><span class="mobile-nav-icon">${icon}</span>${esc(item.label)}</button>`;
      }).join("")}
    </nav>
  </div>`;
  const themeBtn = document.getElementById("sidebar-theme");
  if (themeBtn) themeBtn.addEventListener("click", () => { toggleTheme(); renderShell(); });
  document.getElementById("logout").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" }).catch(() => undefined);
    logoutLocal();
  });
  document.querySelectorAll("[data-mobile-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.mobileRoute;
      if (target) window.location.hash = target.replace(/^#/, "");
    });
  });
  const view = routes[route.view] || viewDashboard;
  void view(route.param).catch((error) => {
    document.getElementById("view").innerHTML = `<div class="error-box">${esc(error.message)}</div>`;
  });
}

window.addEventListener("hashchange", () => {
  if (state.token && state.me) renderShell();
});

/* ---------------- views ---------------- */

async function viewDashboard() {
  const el = document.getElementById("view");
  const data = await api("/api/dashboard");
  const maxRevenue = Math.max(1, ...data.last7Days.map((d) => d.revenueMinor));
  el.innerHTML = `
    <div class="topbar"><h1>Dashboard</h1><span class="muted">${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
    <div class="stat-grid">
      <div class="stat"><div class="label">Today's revenue</div><div class="value">${money(data.todayRevenueMinor)}</div></div>
      <div class="stat"><div class="label">Today's expenses</div><div class="value">${money(data.todayExpensesMinor)}</div></div>
      <div class="stat"><div class="label">Check-ins today</div><div class="value">${data.todayCheckIns}</div></div>
      <div class="stat"><div class="label">Active members</div><div class="value">${data.activeMembers}</div><div class="sub">${data.pendingMembers} pending approval</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <h2>Revenue — last 7 days</h2>
        <div class="bar-chart">
          ${data.last7Days
            .map((d) => `<div class="bar ${d.revenueMinor === maxRevenue && maxRevenue > 0 ? "hot" : ""}" style="height:${Math.max(3, (d.revenueMinor / maxRevenue) * 100)}%"><i>${d.revenueMinor ? money(d.revenueMinor) : ""}</i><b>${d.day.slice(5)}</b></div>`)
            .join("")}
        </div>
        <div style="height:20px"></div>
      </div>
    </div>`;
}

async function viewMembers() {
  const el = document.getElementById("view");
  let query = { search: "", status: "all" };
  async function draw() {
    const data = await api(`/api/members?search=${encodeURIComponent(query.search)}&status=${query.status}`);
    const dashboard = await api("/api/dashboard");
    const todayMs = Date.parse(today());
    const daysLeft = (member) => member.membership_end_date
      ? Math.ceil((Date.parse(member.membership_end_date) - todayMs) / 86400000)
      : null;
    el.innerHTML = `
    <div class="topbar"><h1>Members</h1>
      <div><button class="btn primary" id="scan-face">Check membership by face</button> <button class="btn" id="scan-fingerprint">Check by fingerprint</button> ${can("reports.read") ? `<a class="btn" href="/api/export/members.csv" download>Export CSV</a>` : ""} ${can("members.write") ? `<button class="btn primary" id="add-member">+ Add member</button>` : ""}</div>
    </div>
    <div class="toolbar">
      <input id="search" placeholder="Search name, code, phone…" value="${esc(query.search)}" />
      <select id="status">
        ${[["all", "All members"], ["active", "Active"], ["pending", "Pending"], ["expired", "Expired"], ["suspended", "Suspended"], ["cancelled", "Cancelled"]].map(([value, label]) => `<option value="${value}" ${query.status === value ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <span class="muted">${data.total} members</span>
    </div>
    <div class="member-alerts">
      <div class="card">
        <h2>Expiring within 7 days</h2>
        ${dashboard.expiringSoon.length
          ? dashboard.expiringSoon.map((m) => `<div class="list-item"><a href="#/member/${esc(m.memberId)}">${esc(m.memberName)} <span class="muted">${esc(m.memberCode)}</span></a><span class="muted">${esc(m.planName)} · ${m.daysLeft === 0 ? "today" : `${m.daysLeft}d left`}</span></div>`).join("")
          : `<div class="empty">Nothing expiring this week 🎉</div>`}
      </div>
      <div class="card">
        <h2>Memberships ended</h2>
        ${dashboard.expiredMembers?.length
          ? dashboard.expiredMembers.map((m) => `<div class="list-item"><a href="#/member/${esc(m.memberId)}">${esc(m.memberName)} <span class="muted">${esc(m.memberCode)}</span></a><span class="muted">${esc(m.planName)} · ended ${esc(m.endDate)}</span></div>`).join("")
          : `<div class="empty">No ended memberships.</div>`}
      </div>
    </div>
    ${data.items.length
      ? `<div class="member-grid">${data.items.map((m) => {
          const remaining = daysLeft(m);
          const membershipLabel = remaining === null ? "No membership" : remaining < 0 ? `Ended ${Math.abs(remaining)}d ago` : `${remaining} days left`;
          const membershipKind = remaining === null || remaining < 0 ? "expired" : remaining <= 7 ? "pending" : "active";
          return `<article class="member-card clickable" data-id="${esc(m.id)}">
            ${m.profile_photo_data_url ? `<img src="${esc(m.profile_photo_data_url)}" alt="${esc(m.full_name)}" />` : `<div class="member-photo-placeholder">No photo</div>`}
            <div class="member-card-body"><div class="member-card-heading"><h3>${esc(m.full_name)}</h3>${badge(membershipKind)}</div>
            <div class="member-card-detail">${esc(m.phone || "No phone")}</div>
            <div class="member-card-detail">${esc(m.weight_kg ? `${m.weight_kg} kg` : "Weight not set")}</div>
            <div class="member-card-membership">${esc(membershipLabel)}${m.plan_name ? ` · ${esc(m.plan_name)}` : ""}</div></div>
          </article>`;
        }).join("")}</div>`
      : `<div class="card empty">No members found.</div>`}`;
    el.querySelectorAll(".clickable[data-id]").forEach((card) => card.addEventListener("click", () => navigate("member", card.dataset.id)));
    document.getElementById("search").addEventListener("input", (e) => {
      query.search = e.target.value;
      clearTimeout(el._t);
      el._t = setTimeout(draw, 250);
    });
    document.getElementById("status").addEventListener("change", (e) => {
      query.status = e.target.value;
      void draw();
    });
    const addBtn = document.getElementById("add-member");
    if (addBtn) addBtn.addEventListener("click", () => memberForm());
    const scanButton = document.getElementById("scan-face");
    if (scanButton) scanButton.addEventListener("click", async () => {
      try {
        await liveFaceScanner();
      } catch (error) {
        if (error.message !== "Camera capture cancelled.") alert(error.message);
      }
    });
    const fingerprintButton = document.getElementById("scan-fingerprint");
    if (fingerprintButton) fingerprintButton.addEventListener("click", () => liveFingerprintScanner());
    if (currentRoute().param === "scan") {
      setTimeout(() => scanButton?.click(), 0);
    }
  }
  await draw();
}

async function memberForm(existing, onDone) {
  const plans = !existing ? await api("/api/plans").catch(() => []) : [];
  const backdrop = openModal(`
    <h2>${existing ? "Edit member" : "Add member"}</h2>
    <form id="mf">
      <div class="form-row">
        <div><label>Full name *</label><input name="fullName" required value="${esc(existing?.full_name || "")}" /></div>
        <div><label>Father name</label><input name="fatherName" value="${esc(existing?.father_name || "")}" /></div>
        <div><label>Phone</label><input name="phone" value="${esc(existing?.phone || "")}" /></div>
        <div><label>WhatsApp</label><input name="whatsapp" value="${esc(existing?.whatsapp || "")}" /></div>
        <div><label>Date of birth</label><input name="dateOfBirth" type="date" value="${esc(existing?.date_of_birth || "")}" /></div>
        <div><label>Gender</label>
          <select name="gender">
            ${["male", "female", "other", "unspecified"].map((g) => `<option value="${g}" ${existing?.gender === g ? "selected" : ""}>${g}</option>`).join("")}
          </select></div>
        <div><label>Blood group</label><input name="bloodGroup" value="${esc(existing?.blood_group || "")}" /></div>
        <div><label>Weight (kg)</label><input name="weightKg" type="number" min="1" max="500" step="0.1" value="${esc(existing?.weight_kg || "")}" /></div>
        <div><label>Emergency contact</label><input name="emergencyContact" value="${esc(existing?.emergency_contact || "")}" /></div>
      </div>
      <label>Address</label><input name="address" value="${esc(existing?.address || "")}" />
      <label>Join date *</label><input name="joinDate" type="date" required value="${esc(existing?.join_date || today())}" />
      <label>Notes</label><textarea name="notes" rows="2">${esc(existing?.notes || "")}</textarea>
      ${!existing ? `<div class="card" style="margin-top:14px"><h3>First membership (optional)</h3>
        <label>Plan</label><select name="planId"><option value="">No membership yet</option>${plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${money(p.price_minor)} · ${p.duration_days} days</option>`).join("")}</select>
        <div class="form-row"><div><label>Payment amount</label><input name="initialAmount" type="number" min="0" step="0.01" /></div>
        <div><label>Payment method</label><select name="initialMethod">${["cash", "bank_transfer", "card", "jazzcash", "easypaisa", "other"].map((c) => `<option value="${c}">${c.replaceAll("_", " ")}</option>`).join("")}</select></div></div>
        <p id="initial-plan-help" class="muted">Select a plan to add membership and payment now.</p></div>` : ""}
      <label class="checkbox-row"><input name="enrollFace" type="checkbox" ${!existing ? "checked" : ""} /> Capture and enroll face after saving</label>
      <label class="checkbox-row"><input name="enrollFingerprint" type="checkbox" /> Enroll fingerprint after saving (optional scanner)</label>
      <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save member</button></div>
    </form>`);
  backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
  const planSelect = backdrop.querySelector("[name=planId]");
  const initialAmount = backdrop.querySelector("[name=initialAmount]");
  const initialHelp = backdrop.querySelector("#initial-plan-help");
  if (planSelect) planSelect.addEventListener("change", () => {
    const plan = plans.find((item) => item.id === planSelect.value);
    initialAmount.value = plan ? (plan.price_minor / 100).toFixed(2) : "";
    initialHelp.textContent = plan ? `Membership will start today for ${plan.duration_days} days.` : "Select a plan to add membership and payment now.";
  });
  backdrop.querySelector("#mf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button.primary");
    const originalLabel = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `${spinner(true)} Saving…`;
    }
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    const enrollFace = form.get("enrollFace") === "on";
    const enrollFingerprint = form.get("enrollFingerprint") === "on";
    delete body.enrollFace;
    delete body.enrollFingerprint;
    try {
      let savedMemberId = existing?.id;
      let paymentId = null;
      let selectedPlanId = planSelect?.value || "";
      let created = null;
      if (existing) {
        await api(`/api/members/${existing.id}`, { method: "PUT", body });
      } else {
        created = selectedPlanId
          ? await api("/api/members/with-membership", {
              method: "POST",
              body: {
                member: body,
                membership: {
                  memberId: "new-member",
                  planId: selectedPlanId,
                  startDate: today(),
                  payment: {
                    amountMinor: Math.round(Number(initialAmount.value || 0) * 100),
                    methodCode: backdrop.querySelector("[name=initialMethod]").value,
                    paidAt: new Date().toISOString(),
                  },
                },
              },
            })
          : await api("/api/members", { method: "POST", body });
        savedMemberId = created.id || created.memberId;
        paymentId = created.paymentId || null;
      }
      backdrop.remove();
      toast(existing ? "Member updated successfully." : "Member added successfully.", "success");
      if (!existing && enrollFace) {
        try {
          const frame = await captureFace();
          await api("/api/face/enroll", { method: "POST", body: { memberId: savedMemberId, ...frame } });
          toast("Face enrolled locally on this gym computer.", "success");
        } catch (error) {
          if (error.message !== "Camera capture cancelled.") toast(`Member saved, but face enrollment failed: ${error.message}`, "warn");
        }
      }
      if (enrollFingerprint) {
        try {
          await api("/api/fingerprint/enroll", { method: "POST", body: { memberId: savedMemberId } });
          toast("Fingerprint enrolled on the configured scanner.", "success");
        } catch (error) {
          toast(`Member saved, but fingerprint enrollment failed: ${error.message}`, "warn");
        }
      }
      if (paymentId && selectedPlanId && created) {
        const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
        const initialEnd = new Date(`${today()}T00:00:00`);
        initialEnd.setDate(initialEnd.getDate() + (selectedPlan?.duration_days || 0));
        showReceiptActions(
          { full_name: body.fullName, phone: body.whatsapp || body.phone },
          created,
          selectedPlan,
          Math.round(Number(initialAmount.value || 0) * 100),
          initialEnd.toISOString().slice(0, 10),
        );
      }
      void onDone?.();
    } catch (error) {
      if (submitBtn && originalLabel) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
      toast(error.message, "danger");
    }
  });
}

async function viewMemberDetail(id) {
  const el = document.getElementById("view");
  const data = await api(`/api/members/${id}`);
  const m = data.member;
  el.innerHTML = `
    <div class="topbar">
      <div><a href="#/members">← Members</a><h1>${esc(m.full_name)} <span class="muted" style="font-size:14px">${esc(m.member_code)}</span></h1></div>
      <div style="display:flex;gap:8px">
            ${can("members.write") ? `<button class="btn" id="edit">Edit</button>` : ""}
        ${can("memberships.write") ? `<button class="btn primary" id="renew">Renew / new plan</button>` : ""}
        ${can("members.delete") ? `<button class="btn danger" id="archive">Remove</button>` : ""}
      </div>
    </div>
    <div class="grid2">
      <div class="card">
        <h2>Profile</h2>
        ${m.profile_photo_path ? `<img src="/api/members/${esc(m.id)}/photo" alt="Member photo" style="width:120px;height:140px;object-fit:cover;border-radius:8px;margin-bottom:12px" />` : ""}
        <div class="list-item"><span class="muted">Status</span>${badge(m.status)}</div>
        <div class="list-item"><span class="muted">Phone</span><span>${esc(m.phone || "—")}</span></div>
        <div class="list-item"><span class="muted">Email</span><span>${esc(m.email || "—")}</span></div>
        <div class="list-item"><span class="muted">Joined</span><span>${esc(m.join_date)}</span></div>
        <div class="list-item"><span class="muted">Blood group</span><span>${esc(m.blood_group || "—")}</span></div>
        <div class="list-item"><span class="muted">Weight</span><span>${m.weight_kg ? `${m.weight_kg} kg` : "—"}</span></div>
        <div class="list-item"><span class="muted">Emergency</span><span>${esc(m.emergency_contact || "—")}</span></div>
      </div>
      <div class="card">
        <h2>Memberships</h2>
        ${data.memberships.length
          ? data.memberships
              .map(
                (ms) => `<div class="list-item"><span>${esc(ms.plan_name)}<br/><span class="muted">${esc(ms.start_date)} → ${esc(ms.end_date)}</span></span><span>${badge(ms.status)} ${badge(ms.payment_status)}</span></div>`,
              )
              .join("")
          : `<div class="empty">No memberships yet.</div>`}
      </div>
      <div class="card">
        <h2>Recent payments</h2>
        ${data.payments.length
          ? data.payments
              .map(
                (p) => `<div class="list-item"><span>${esc(p.receipt_number)} · ${esc(p.method_code)}<br/><span class="muted">${esc(p.paid_at.slice(0, 10))}</span></span><a href="/api/payments/${esc(p.id)}/receipt" target="_blank">${money(p.amount_minor)} 🧾</a></div>`,
              )
              .join("")
          : `<div class="empty">No payments yet.</div>`}
      </div>
    </div>`;

  const editBtn = document.getElementById("edit");
  if (editBtn)
    editBtn.addEventListener("click", () =>
      memberForm(m, () => {
        void viewMemberDetail(id);
      }),
    );
  const renewBtn = document.getElementById("renew");
  if (renewBtn)
    renewBtn.addEventListener("click", async () => {
      const plans = await api("/api/plans");
      if (!plans.length) return alert("Create a membership plan first (Memberships page).");
      const backdrop = openModal(`
        <h2>Renew / add membership</h2>
        <form id="rf">
          <label>Plan *</label>
          <select name="planId">${plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} — ${money(p.price_minor)} / ${p.duration_days}d</option>`).join("")}</select>
          <div class="form-row">
            <div><label>Amount *</label><input name="amount" type="number" min="0" step="0.01" required /></div>
            <div><label>Method</label>
              <select name="methodCode">${["cash", "bank_transfer", "card", "jazzcash", "easypaisa", "other"].map((c) => `<option value="${c}">${c.replaceAll("_", " ")}</option>`).join("")}</select></div>
          </div>
          <label>Notes</label><input name="notes" />
          <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save & send on WhatsApp</button></div>
        </form>`);
      backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
      backdrop.querySelector("select").addEventListener("change", (e) => {
        const plan = plans.find((p) => p.id === e.target.value);
        backdrop.querySelector("[name=amount]").value = (plan.price_minor / 100).toFixed(2);
      });
      backdrop.querySelector("[name=amount]").value = (plans[0].price_minor / 100).toFixed(2);
      backdrop.querySelector("#rf").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const plan = plans.find((p) => p.id === form.get("planId"));
        const start = new Date();
        const startIso = start.toISOString().slice(0, 10);
        // Extend from current end date when still active, otherwise from today.
        const active = data.memberships.find((ms) => ms.status === "active" && ms.end_date >= startIso);
        const startDate = active ? active.end_date : startIso;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duration_days);
        const payment = {
          amountMinor: Math.round(Number(form.get("amount")) * 100),
          methodCode: form.get("methodCode"),
          notes: form.get("notes") || undefined,
          paidAt: new Date().toISOString(),
        };
        try {
          const result = active
            ? await api("/api/memberships/renew", {
                method: "POST",
                body: { membershipId: active.id, planId: plan.id, startDate, payment },
              })
            : await api("/api/payments", {
                method: "POST",
                body: { memberId: m.id, planId: plan.id, startDate, endDate: endDate.toISOString().slice(0, 10), payment },
              });
          backdrop.remove();
          openWhatsAppReceipt(m, result, plan, payment.amountMinor, endDate.toISOString().slice(0, 10));
          void viewMemberDetail(id);
        } catch (error) {
          alert(error.message);
        }
      });
    });
  const archiveBtn = document.getElementById("archive");
  if (archiveBtn)
    archiveBtn.addEventListener("click", async () => {
      if (!confirm(`Remove ${m.full_name}? Their history is kept but they will be marked cancelled.`)) return;
      await api(`/api/members/${m.id}`, { method: "DELETE" });
      navigate("members");
    });
}

async function viewAttendance() {
  const el = document.getElementById("view");
  const day = today();
  async function draw(selectedDay) {
    const list = await api(`/api/attendance?day=${selectedDay}`);
    el.innerHTML = `
    <div class="topbar"><h1>Attendance</h1>
      ${can("attendance.write") ? `<button class="btn primary" id="quick">Quick check-in</button>` : ""}
    </div>
    <div class="toolbar">
      <input id="day" type="date" value="${selectedDay}" />
      <span class="muted">${list.length} records</span>
    </div>
    ${list.length
      ? `<table class="table"><tr><th>Time</th><th>Member</th><th>Code</th><th>Direction</th><th>Method</th></tr>
        ${list.map((a) => `<tr><td>${esc(a.occurred_at.slice(11, 16))}</td><td>${esc(a.member_name)}</td><td>${esc(a.member_code)}</td><td>${badge(a.direction)}</td><td>${esc(a.method)}</td></tr>`).join("")}</table>`
      : `<div class="card empty">No attendance recorded for this day.</div>`}`;
    document.getElementById("day").addEventListener("change", (e) => draw(e.target.value));
    const quick = document.getElementById("quick");
    if (quick)
      quick.addEventListener("click", async () => {
        const backdrop = openModal(`
          <h2>Quick check-in</h2>
          <p class="muted">Type the member name or code, pick them, and we record the visit.</p>
          <input id="q" placeholder="Search member…" />
          <div id="results" style="margin-top:10px"></div>`);
        const input = backdrop.querySelector("#q");
        const results = backdrop.querySelector("#results");
        input.focus();
        let timer;
        input.addEventListener("input", () => {
          clearTimeout(timer);
          timer = setTimeout(async () => {
            const found = await api(`/api/members?search=${encodeURIComponent(input.value)}&status=active&limit=8`);
            results.innerHTML = found.items
              .map((m) => `<div class="list-item"><span>${esc(m.full_name)} <span class="muted">${esc(m.member_code)}</span></span><button class="btn small success" data-id="${esc(m.id)}">Toggle</button></div>`)
              .join("");
            results.querySelectorAll("button").forEach((btn) =>
              btn.addEventListener("click", async () => {
                try {
                  const result = await api("/api/attendance/toggle", { method: "POST", body: { memberId: btn.dataset.id } });
                  backdrop.remove();
                  alert(`Recorded ${result.direction.replaceAll("_", " ")}`);
                  void draw(selectedDay);
                } catch (error) {
                  alert(error.message);
                }
              }),
            );
          }, 250);
        });
      });
  }
  await draw(day);
}

async function viewMemberships() {
  const el = document.getElementById("view");
  const [memberships, plans] = await Promise.all([api("/api/memberships"), api("/api/plans?all=1")]);
  const expiring = await api("/api/memberships?expiringWithinDays=7");
  el.innerHTML = `
  <div class="topbar"><h1>Memberships</h1>
    ${can("memberships.write") ? `<button class="btn primary" id="add-plan">+ New plan</button>` : ""}
  </div>
  <div class="card" style="margin-bottom:16px">
    <h2>Plans</h2>
    ${plans.length
      ? `<table class="table"><tr><th>Name</th><th>Price</th><th>Duration</th><th>Status</th><th></th></tr>
        ${plans
          .map(
            (p) => `<tr><td>${esc(p.name)}</td><td>${money(p.price_minor)}</td><td>${p.duration_days} days</td><td>${p.is_active ? badge("active") : badge("expired")}</td>
            <td>${can("memberships.write") ? `<button class="btn small" data-edit="${esc(p.id)}">Edit</button> <button class="btn small" data-toggle="${esc(p.id)}" data-active="${p.is_active}">${p.is_active ? "Disable" : "Enable"}</button>` : ""}</td></tr>`,
          )
          .join("")}</table>`
      : `<div class="empty">No plans yet — add your first plan.</div>`}
  </div>
  <div class="card" style="margin-bottom:16px">
    <h2>Expiring in 7 days</h2>
    ${expiring.length
      ? expiring.map((ms) => `<div class="list-item"><a href="#/member/${esc(ms.member_id)}">${esc(ms.member_name)} ${esc(ms.member_code)}</a><span class="muted">${esc(ms.plan_name)} · ends ${esc(ms.end_date)}</span></div>`).join("")
      : `<div class="empty">Nothing expiring soon.</div>`}
  </div>
  <div class="card">
    <h2>All memberships</h2>
    ${memberships.length
      ? `<table class="table"><tr><th>Member</th><th>Plan</th><th>Period</th><th>Status</th><th>Payment</th></tr>
        ${memberships
          .map(
            (ms) => `<tr><td><a href="#/member/${esc(ms.member_id)}">${esc(ms.member_name)}</a> <span class="muted">${esc(ms.member_code)}</span></td><td>${esc(ms.plan_name)}</td><td>${esc(ms.start_date)} → ${esc(ms.end_date)}</td><td>${badge(ms.status)}</td><td>${badge(ms.payment_status)}</td></tr>`,
          )
          .join("")}</table>`
      : `<div class="empty">No memberships yet.</div>`}
  </div>`;
  const addBtn = document.getElementById("add-plan");
  if (addBtn) addBtn.addEventListener("click", () => planForm(null, () => viewMemberships()));
  el.querySelectorAll("[data-edit]").forEach((btn) => {
    const plan = plans.find((p) => p.id === btn.dataset.edit);
    btn.addEventListener("click", () => planForm(plan, () => viewMemberships()));
  });
  el.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await api(`/api/plans/${btn.dataset.toggle}/active`, { method: "POST", body: { isActive: btn.dataset.active !== "1" } });
      void viewMemberships();
    }),
  );
}

function planForm(plan, onDone) {
  const backdrop = openModal(`
    <h2>${plan ? "Edit plan" : "New membership plan"}</h2>
    <form id="pf">
      <label>Name *</label><input name="name" required value="${esc(plan?.name || "")}" />
      <div class="form-row">
        <div><label>Price (${esc(state.currency)}) *</label><input name="price" type="number" min="0" step="0.01" required value="${plan ? (plan.price_minor / 100).toFixed(2) : ""}" /></div>
        <div><label>Duration (days) *</label><input name="durationDays" type="number" min="1" required value="${plan?.duration_days || 30}" /></div>
      </div>
      <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save plan</button></div>
    </form>`);
  backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#pf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = {
      name: form.get("name"),
      priceMinor: Math.round(Number(form.get("price")) * 100),
      durationDays: Number(form.get("durationDays")),
    };
    try {
      if (plan) await api(`/api/plans/${plan.id}`, { method: "PUT", body });
      else await api("/api/plans", { method: "POST", body });
      backdrop.remove();
      void onDone?.();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function viewPayments() {
  const el = document.getElementById("view");
  const monthStart = `${today().slice(0, 7)}-01`;
  async function draw(from, to) {
    const payments = await api(`/api/payments?from=${from}&to=${to}`);
    const total = payments.reduce((sum, p) => sum + p.amount_minor, 0);
    el.innerHTML = `
    <div class="topbar"><div><span class="eyebrow">FINANCE</span><h1>Payments</h1><p class="muted">Track collections and renew members in a few clicks.</p></div><div class="topbar-actions">${can("payments.write") ? `<button class="btn primary" id="quick-renew">＋ Renew membership</button>` : ""}</div></div>
    <div class="stat-grid compact-stats"><div class="stat"><div class="label">Collected this period</div><div class="value">${money(total)}</div><div class="sub">${payments.length} payment${payments.length === 1 ? "" : "s"}</div></div><div class="stat"><div class="label">Date range</div><div class="value">${esc(from)} <span class="muted">to</span></div><div class="sub">${esc(to)}</div></div></div>
    <div class="toolbar card payment-filter">
      <div><label>From</label><input id="from" type="date" value="${from}" /></div>
      <span class="muted">to</span>
      <div><label>To</label><input id="to" type="date" value="${to}" /></div>
      <span class="spacer"></span><span class="muted">Receipts are stored locally and available to print anytime.</span>
    </div>
    ${payments.length
      ? `<div class="table-wrap"><table class="table"><tr><th>Receipt</th><th>Date</th><th>Member</th><th>Plan</th><th>Method</th><th>Amount</th><th></th></tr>
        ${payments
          .map(
            (p) => `<tr><td>${esc(p.receipt_number)}</td><td>${esc(p.paid_at.slice(0, 10))}</td><td>${p.member_id ? `<a href="#/member/${esc(p.member_id)}">${esc(p.member_name || "")}</a>` : "—"}</td><td>${esc(p.plan_name || "—")}</td><td>${esc(p.method_code.replaceAll("_", " "))}</td><td><b>${money(p.amount_minor)}</b></td><td><a href="/api/payments/${esc(p.id)}/receipt" target="_blank">🧾 open</a></td></tr>`,
          )
          .join("")}</table></div>`
      : `<div class="card empty">No payments in this period.</div>`}`;
    document.getElementById("from").addEventListener("change", (e) => draw(e.target.value, document.getElementById("to").value));
    document.getElementById("to").addEventListener("change", (e) => draw(document.getElementById("from").value, e.target.value));
    const renewButton = document.getElementById("quick-renew");
    if (renewButton) renewButton.addEventListener("click", () => quickRenewForm(() => draw(from, to)));
  }
  await draw(monthStart, today());
}

async function quickRenewForm(onDone) {
  const plans = await api("/api/plans");
  if (!plans.length) return alert("Create a membership plan first in Memberships.");
  const backdrop = openModal(`
    <h2>Renew membership</h2>
    <p class="muted">Search for a member, choose a plan, and take payment.</p>
    <label>Member *</label>
    <input id="renew-member-search" autocomplete="off" placeholder="Type name, member code, or phone…" />
    <div id="renew-member-results" style="margin-top:8px"></div>
    <div id="renew-selected" class="card" style="display:none;margin-top:12px"></div>
    <form id="quick-renew-form" style="display:none;margin-top:12px">
      <div class="form-row">
        <div><label>Plan *</label><select name="planId">${plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${money(p.price_minor)} · ${p.duration_days} days</option>`).join("")}</select></div>
        <div><label>Amount (${esc(state.currency)}) *</label><input name="amount" type="number" min="0" step="0.01" required /></div>
      </div>
      <div id="renew-period" class="card" style="margin:10px 0"></div>
      <label>Payment method</label>
      <select name="methodCode">${["cash", "bank_transfer", "card", "jazzcash", "easypaisa", "other"].map((c) => `<option value="${c}">${c.replaceAll("_", " ")}</option>`).join("")}</select>
      <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary" id="save-renew">Save & send on WhatsApp</button></div>
    </form>`);
  let selected = null;
  let selectedDetail = null;
  const search = backdrop.querySelector("#renew-member-search");
  const results = backdrop.querySelector("#renew-member-results");
  const selectedBox = backdrop.querySelector("#renew-selected");
  const form = backdrop.querySelector("#quick-renew-form");
  const planSelect = form.querySelector("[name=planId]");
  const amount = form.querySelector("[name=amount]");
  const period = form.querySelector("#renew-period");
  const updatePlan = () => {
    if (!selectedDetail) return;
    const plan = plans.find((item) => item.id === planSelect.value);
    amount.value = (plan.price_minor / 100).toFixed(2);
    const current = selectedDetail.memberships.find((item) => item.status === "active" && item.end_date >= today());
    const startDate = current ? current.end_date : today();
    const endDate = new Date(`${startDate}T00:00:00`);
    endDate.setDate(endDate.getDate() + plan.duration_days);
    period.innerHTML = `<b>${current ? "Extension" : "New membership"}</b><br/><span class="muted">${startDate} → ${endDate.toISOString().slice(0, 10)} · ${plan.duration_days} days</span>`;
  };
  backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
  planSelect.addEventListener("change", updatePlan);
  let timer;
  search.focus();
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (search.value.trim().length < 2) {
        results.innerHTML = "";
        return;
      }
      const found = await api(`/api/members?search=${encodeURIComponent(search.value)}&status=all&limit=8`);
      results.innerHTML = found.items.map((member) => `<button type="button" class="list-item" data-id="${esc(member.id)}" style="width:100%;text-align:left;border:0;cursor:pointer"><span><b>${esc(member.full_name)}</b><br/><span class="muted">${esc(member.member_code)} · ${esc(member.phone || "no phone")}</span></span><span>${esc(member.membership_end_date ? `ends ${member.membership_end_date}` : "No plan")}</span></button>`).join("") || `<div class="empty">No member found.</div>`;
      results.querySelectorAll("[data-id]").forEach((button) => button.addEventListener("click", async () => {
        selected = button.dataset.id;
        selectedDetail = await api(`/api/members/${selected}`);
        search.value = selectedDetail.member.full_name;
        results.innerHTML = "";
        selectedBox.style.display = "block";
        selectedBox.innerHTML = `<b>${esc(selectedDetail.member.full_name)}</b> · ${esc(selectedDetail.member.member_code)}<br/><span class="muted">${esc(selectedDetail.member.phone || "No phone")} · current plan: ${esc(selectedDetail.member.plan_name || "None")}</span>`;
        form.style.display = "block";
        updatePlan();
      }));
    }, 200);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selected || !selectedDetail) return alert("Select a member first.");
    const chosenPlan = plans.find((item) => item.id === planSelect.value);
    const current = selectedDetail.memberships.find((item) => item.status === "active" && item.end_date >= today());
    const startDate = current ? current.end_date : today();
    const endDate = new Date(`${startDate}T00:00:00`);
    endDate.setDate(endDate.getDate() + chosenPlan.duration_days);
    const payment = {
      amountMinor: Math.round(Number(amount.value) * 100),
      methodCode: form.querySelector("[name=methodCode]").value,
      paidAt: new Date().toISOString(),
    };
    const saveButton = backdrop.querySelector("#save-renew");
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    try {
      const result = current
        ? await api("/api/memberships/renew", { method: "POST", body: { membershipId: current.id, planId: chosenPlan.id, startDate, payment } })
        : await api("/api/payments", { method: "POST", body: { memberId: selected, planId: chosenPlan.id, startDate, endDate: endDate.toISOString().slice(0, 10), payment } });
      backdrop.remove();
      openWhatsAppReceipt(selectedDetail.member, result, chosenPlan, payment.amountMinor, endDate.toISOString().slice(0, 10));
      void onDone?.();
    } catch (error) {
      saveButton.disabled = false;
      saveButton.textContent = "Save & send on WhatsApp";
      alert(error.message);
    }
  });
}

async function viewExpenses() {
  const el = document.getElementById("view");
  const monthStart = `${today().slice(0, 7)}-01`;
  async function draw(from, to) {
    const [expenses, categories] = await Promise.all([
      api(`/api/expenses?from=${from}&to=${to}`),
      api("/api/expense-categories"),
    ]);
    const total = expenses.reduce((sum, e) => sum + e.amount_minor, 0);
    el.innerHTML = `
    <div class="topbar"><h1>Expenses</h1><span class="muted">Total: <b>${money(total)}</b></span></div>
    <div class="toolbar">
      <input id="from" type="date" value="${from}" /><span class="muted">to</span><input id="to" type="date" value="${to}" />
      <div class="spacer"></div>
      <button class="btn primary" id="add">+ Record expense</button>
    </div>
    ${expenses.length
      ? `<table class="table"><tr><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th></tr>
        ${expenses
          .map(
            (e) => `<tr><td>${esc(e.incurred_at.slice(0, 10))}</td><td>${esc(e.category_name)}</td><td>${esc(e.description)}</td><td>${esc(e.vendor || "—")}</td><td><b>${money(e.amount_minor)}</b></td></tr>`,
          )
          .join("")}</table>`
      : `<div class="card empty">No expenses in this period.</div>`}`;
    document.getElementById("from").addEventListener("change", (e) => draw(e.target.value, document.getElementById("to").value));
    document.getElementById("to").addEventListener("change", (e) => draw(document.getElementById("from").value, e.target.value));
    document.getElementById("add").addEventListener("click", () => {
      const backdrop = openModal(`
        <h2>Record expense</h2>
        <form id="ef">
          <div class="form-row">
            <div><label>Category *</label><select name="categoryId">${categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select></div>
            <div><label>Amount (${esc(state.currency)}) *</label><input name="amount" type="number" min="0" step="0.01" required /></div>
          </div>
          <label>Description *</label><input name="description" required />
          <label>Vendor</label><input name="vendor" />
          <label>Date *</label><input name="date" type="date" value="${today()}" required />
          <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save expense</button></div>
        </form>`);
      backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
      backdrop.querySelector("#ef").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        try {
          await api("/api/expenses", {
            method: "POST",
            body: {
              categoryId: form.get("categoryId"),
              amountMinor: Math.round(Number(form.get("amount")) * 100),
              description: form.get("description"),
              vendor: form.get("vendor") || undefined,
              incurredAt: `${form.get("date")}T12:00:00.000Z`,
            },
          });
          backdrop.remove();
          void draw(from, to);
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }
  await draw(monthStart, today());
}

async function viewIncome() {
  const el = document.getElementById("view");
  const monthStart = `${today().slice(0, 7)}-01`;
  async function draw(from, to) {
    const income = await api(`/api/income?from=${from}&to=${to}`);
    const total = income.reduce((sum, i) => sum + i.amount_minor, 0);
    el.innerHTML = `
    <div class="topbar"><h1>Other income</h1><span class="muted">Total: <b>${money(total)}</b></span></div>
    <div class="toolbar">
      <input id="from" type="date" value="${from}" /><span class="muted">to</span><input id="to" type="date" value="${to}" />
      <div class="spacer"></div>
      <button class="btn primary" id="add">+ Record income</button>
    </div>
    ${income.length
      ? `<table class="table"><tr><th>Date</th><th>Source</th><th>Notes</th><th>Amount</th></tr>
        ${income
          .map(
            (i) => `<tr><td>${esc(i.received_at.slice(0, 10))}</td><td>${esc(i.source)}</td><td>${esc(i.notes || "—")}</td><td><b>${money(i.amount_minor)}</b></td></tr>`,
          )
          .join("")}</table>`
      : `<div class="card empty">No income recorded in this period.</div>`}`;
    document.getElementById("from").addEventListener("change", (e) => draw(e.target.value, document.getElementById("to").value));
    document.getElementById("to").addEventListener("change", (e) => draw(document.getElementById("from").value, e.target.value));
    document.getElementById("add").addEventListener("click", () => {
      const backdrop = openModal(`
        <h2>Record other income</h2>
        <form id="if">
          <label>Source *</label><input name="source" required placeholder="Supplement sales, personal training…" />
          <div class="form-row">
            <div><label>Amount (${esc(state.currency)}) *</label><input name="amount" type="number" min="0" step="0.01" required /></div>
            <div><label>Date *</label><input name="date" type="date" value="${today()}" required /></div>
          </div>
          <label>Notes</label><input name="notes" />
          <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save income</button></div>
        </form>`);
      backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
      backdrop.querySelector("#if").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        try {
          await api("/api/income", {
            method: "POST",
            body: {
              source: form.get("source"),
              amountMinor: Math.round(Number(form.get("amount")) * 100),
              notes: form.get("notes") || undefined,
              receivedAt: `${form.get("date")}T12:00:00.000Z`,
            },
          });
          backdrop.remove();
          void draw(from, to);
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }
  await draw(monthStart, today());
}

async function viewStaff() {
  const el = document.getElementById("view");
  const staff = await api("/api/staff");
  el.innerHTML = `
  <div class="topbar"><h1>Staff</h1>
    <button class="btn primary" id="add">+ Add staff member</button>
  </div>
  <div class="card">
    ${staff.length
      ? `<table class="table"><tr><th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th><th></th></tr>
        ${staff
          .map(
            (s) => `<tr><td>${esc(s.full_name)}</td><td>${esc(s.username || "—")}</td><td>${esc(s.role)}</td><td>${esc(s.phone || "—")}</td><td>${s.salary_minor ? money(s.salary_minor) : "—"}</td><td>${s.is_active ? badge("active") : badge("expired")}</td>
            <td><button class="btn small" data-edit="${esc(s.employee_id)}">Edit</button> ${s.is_active ? `<button class="btn small danger" data-del="${esc(s.employee_id)}">Remove</button>` : ""}</td></tr>`,
          )
          .join("")}</table>`
      : `<div class="empty">No staff members yet.</div>`}
  </div>`;
  document.getElementById("add").addEventListener("click", () => staffForm(null, () => viewStaff()));
  el.querySelectorAll("[data-edit]").forEach((btn) => {
    const person = staff.find((s) => s.employee_id === btn.dataset.edit);
    btn.addEventListener("click", () => staffForm(person, () => viewStaff()));
  });
  el.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this staff member? Their login will be deactivated.")) return;
      await api(`/api/staff/${btn.dataset.del}`, { method: "DELETE" });
      void viewStaff();
    }),
  );
}

function staffForm(person, onDone) {
  const backdrop = openModal(`
    <h2>${person ? "Edit staff member" : "Add staff member"}</h2>
    <form id="sf">
      <div class="form-row">
        <div><label>Full name *</label><input name="fullName" required value="${esc(person?.full_name || "")}" /></div>
        <div><label>Phone</label><input name="phone" value="${esc(person?.phone || "")}" /></div>
        <div><label>Role *</label>
          <select name="role">${["receptionist", "manager", "admin", "staff"].map((r) => `<option value="${r}" ${person?.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        <div><label>Salary (${esc(state.currency)})</label><input name="salary" type="number" min="0" step="0.01" value="${person?.salary_minor ? person.salary_minor / 100 : ""}" /></div>
        ${person ? "" : `<div><label>Username *</label><input name="username" required minlength="3" /></div>
        <div><label>Password *</label><input name="password" type="password" required minlength="8" /></div>`}
      </div>
      ${person ? `<label><input type="checkbox" name="isActive" style="width:auto" ${person.is_active ? "checked" : ""}> Active (can sign in)</label>` : ""}
      <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save</button></div>
    </form>`);
  backdrop.querySelector("#cancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#sf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      if (person) {
        await api(`/api/staff/${person.employee_id}`, {
          method: "PUT",
          body: {
            fullName: form.get("fullName"),
            phone: form.get("phone") || undefined,
            role: form.get("role"),
            salaryMinor: form.get("salary") ? Math.round(Number(form.get("salary")) * 100) : undefined,
            isActive: form.get("isActive") === "on",
          },
        });
      } else {
        await api("/api/staff", {
          method: "POST",
          body: {
            fullName: form.get("fullName"),
            phone: form.get("phone") || undefined,
            role: form.get("role"),
            username: form.get("username"),
            password: form.get("password"),
            salaryMinor: form.get("salary") ? Math.round(Number(form.get("salary")) * 100) : undefined,
          },
        });
      }
      backdrop.remove();
      void onDone?.();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function viewReports() {
  const el = document.getElementById("view");
  const monthStart = `${today().slice(0, 7)}-01`;
  async function draw(from, to) {
    const [financial, memberStats] = await Promise.all([
      api(`/api/reports/financial?from=${from}&to=${to}`),
      api("/api/reports/members"),
    ]);
    const maxDay = Math.max(1, ...financial.revenueByDay.map((d) => d.totalMinor));
    el.innerHTML = `
    <div class="topbar"><h1>Reports</h1></div>
    <div class="toolbar">
      <input id="from" type="date" value="${from}" /><span class="muted">to</span><input id="to" type="date" value="${to}" />
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="label">Revenue</div><div class="value">${money(financial.totals.revenueMinor)}</div></div>
      <div class="stat"><div class="label">Other income</div><div class="value">${money(financial.totals.otherIncomeMinor)}</div></div>
      <div class="stat"><div class="label">Expenses</div><div class="value">${money(financial.totals.expensesMinor)}</div></div>
      <div class="stat"><div class="label">Net</div><div class="value" style="color:${financial.totals.netMinor >= 0 ? "var(--success)" : "var(--danger)"}">${money(financial.totals.netMinor)}</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <h2>Revenue by day</h2>
        ${financial.revenueByDay.length
          ? `<div class="bar-chart">${financial.revenueByDay.map((d) => `<div class="bar ${d.totalMinor === maxDay ? "hot" : ""}" style="height:${Math.max(3, (d.totalMinor / maxDay) * 100)}%"><i>${money(d.totalMinor)}</i><b>${d.day.slice(5)}</b></div>`).join("")}</div><div style="height:20px"></div>`
          : `<div class="empty">No revenue in this period.</div>`}
      </div>
      <div class="card">
        <h2>Payment methods</h2>
        ${financial.revenueByMethod.length
          ? financial.revenueByMethod.map((r) => `<div class="list-item"><span>${esc(r.methodCode.replaceAll("_", " "))} <span class="muted">(${r.count})</span></span><b>${money(r.totalMinor)}</b></div>`).join("")
          : `<div class="empty">No payments.</div>`}
      </div>
      <div class="card">
        <h2>Expenses by category</h2>
        ${financial.expensesByCategory.length
          ? financial.expensesByCategory.map((r) => `<div class="list-item"><span>${esc(r.categoryName)} <span class="muted">(${r.count})</span></span><b>${money(r.totalMinor)}</b></div>`).join("")
          : `<div class="empty">No expenses.</div>`}
      </div>
      <div class="card">
        <h2>Members</h2>
        <div class="list-item"><span>Total members</span><b>${memberStats.total}</b></div>
        <div class="list-item"><span>Active</span><b>${memberStats.active}</b></div>
        <div class="list-item"><span>Expired</span><b>${memberStats.expired}</b></div>
        <div class="list-item"><span>Pending</span><b>${memberStats.pending}</b></div>
        <div class="list-item"><span>New in period</span><b>${financial.newMembers}</b></div>
        <div class="list-item"><span>Renewals in period</span><b>${financial.renewals}</b></div>
      </div>
    </div>`;
    document.getElementById("from").addEventListener("change", (e) => draw(e.target.value, document.getElementById("to").value));
    document.getElementById("to").addEventListener("change", (e) => draw(document.getElementById("from").value, e.target.value));
  }
  await draw(monthStart, today());
}

async function viewBackups() {
  const el = document.getElementById("view");
  const data = await api("/api/backups");
  el.innerHTML = `
  <div class="topbar"><h1>Backups</h1>
    <button class="btn primary" id="create">Create backup now</button>
  </div>
  <div class="ok-box">Backups are stored locally in your data folder. Create one before big changes, and keep a copy on a USB drive weekly.</div>
  ${data.files.length
    ? `<table class="table"><tr><th>File</th><th>Created</th><th>Size</th><th></th></tr>
      ${data.files
        .map(
          (f) => `<tr><td>${esc(f.fileName)}</td><td>${new Date(f.createdAt).toLocaleString()}</td><td>${(f.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
          <td><button class="btn small danger" data-restore="${esc(f.filePath)}">Restore</button></td></tr>`,
        )
        .join("")}</table>`
    : `<div class="card empty">No backups yet. Create your first one.</div>`}`;
  document.getElementById("create").addEventListener("click", async () => {
    await api("/api/backups", { method: "POST" });
    void viewBackups();
  });
  el.querySelectorAll("[data-restore]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Restore this backup? Your current data will first be saved as a safety copy, and the app will need a restart.")) return;
      const result = await api("/api/backups/restore", { method: "POST", body: { filePath: btn.dataset.restore } });
      alert(result.message);
    }),
  );
}

async function viewEquipment() {
  const el = document.getElementById("view");
  const items = await api("/api/equipment");
  el.innerHTML = `
    <div class="topbar"><h1>Equipment</h1><button class="btn primary" id="add-equipment">+ Add equipment</button></div>
    <div class="card">${items.length ? `<table class="table"><tr><th>Name</th><th>Category</th><th>Location</th><th>Status</th><th>Next maintenance</th><th></th></tr>
      ${items.map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.category || "—")}</td><td>${esc(item.location || "—")}</td><td>${badge(item.status)}</td><td>${esc(item.next_maintenance_at || "—")}</td><td style="display:flex;gap:6px;justify-content:flex-end"><button class="btn small" data-edit="${esc(item.id)}">Edit</button>${can("settings.manage") ? `<button class="btn small danger" data-del="${esc(item.id)}">Delete</button>` : ""}</td></tr>`).join("")}</table>` : `<div class="empty">No equipment recorded.</div>`}</div>`;
  document.getElementById("add-equipment").addEventListener("click", () => equipmentForm(null, () => viewEquipment()));
  el.querySelectorAll("[data-edit]").forEach((button) => {
    const item = items.find((candidate) => candidate.id === button.dataset.edit);
    button.addEventListener("click", () => equipmentForm(item, () => viewEquipment()));
  });
  el.querySelectorAll("[data-del]").forEach((button) => {
    const item = items.find((candidate) => candidate.id === button.dataset.del);
    button.addEventListener("click", async () => {
      if (!item) return;
      if (!confirm(`Delete equipment "${item.name}"? This cannot be undone.`)) return;
      const originalLabel = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `${spinner(true)} …`;
      try {
        await api(`/api/equipment/${item.id}`, { method: "DELETE" });
        toast(`Equipment "${item.name}" deleted.`, "success");
        void viewEquipment();
      } catch (error) {
        button.disabled = false;
        button.innerHTML = originalLabel;
        toast(error.message, "danger");
      }
    });
  });
}

function equipmentForm(item, onDone) {
  const modal = openModal(`<h2>${item ? "Edit equipment" : "Add equipment"}</h2><form id="equipment-form">
    <div class="form-row"><div><label>Name *</label><input name="name" required value="${esc(item?.name || "")}"></div><div><label>Category</label><input name="category" value="${esc(item?.category || "")}"></div>
    <div><label>Brand</label><input name="brand" value="${esc(item?.brand || "")}"></div><div><label>Model</label><input name="model" value="${esc(item?.model || "")}"></div>
    <div><label>Serial number</label><input name="serialNumber" value="${esc(item?.serial_number || "")}"></div><div><label>Location</label><input name="location" value="${esc(item?.location || "")}"></div>
    <div><label>Purchase cost</label><input name="purchaseCost" type="number" min="0" step="0.01" value="${item?.purchase_cost_minor ? item.purchase_cost_minor / 100 : ""}"></div><div><label>Status</label><select name="status">${["working", "needs_maintenance", "out_of_service", "retired"].map((status) => `<option value="${status}" ${item?.status === status ? "selected" : ""}>${titleCase(status)}</option>`).join("")}</select></div>
    <div><label>Next maintenance</label><input name="nextMaintenanceAt" type="date" value="${esc(item?.next_maintenance_at || "")}"></div></div>
    <label>Notes</label><textarea name="notes" rows="2">${esc(item?.notes || "")}</textarea>
    <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary">Save</button></div></form>`);
  modal.querySelector("#cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#equipment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = event.target.querySelector("button.primary");
    const originalLabel = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `${spinner(true)} Saving…`;
    }
    const form = new FormData(event.target);
    const body = { name: form.get("name"), category: form.get("category") || undefined, brand: form.get("brand") || undefined, model: form.get("model") || undefined, serialNumber: form.get("serialNumber") || undefined, location: form.get("location") || undefined, status: form.get("status"), notes: form.get("notes") || undefined, nextMaintenanceAt: form.get("nextMaintenanceAt") || undefined, purchaseCostMinor: form.get("purchaseCost") ? Math.round(Number(form.get("purchaseCost")) * 100) : undefined };
    try {
      await api(item ? `/api/equipment/${item.id}` : "/api/equipment", { method: item ? "PUT" : "POST", body });
      modal.remove();
      toast(item ? "Equipment updated." : "Equipment added.", "success");
      void onDone?.();
    } catch (error) {
      if (submitBtn && originalLabel) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
      toast(error.message, "danger");
    }
  });
}

async function viewAudit() {
  const el = document.getElementById("view");
  const logs = await api("/api/audit");
  el.innerHTML = `<div class="topbar"><h1>Audit log</h1><span class="muted">${logs.length} recent events</span></div><div class="card">${logs.length ? `<table class="table"><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Device</th></tr>${logs.map((log) => `<tr><td>${esc(new Date(log.created_at).toLocaleString())}</td><td>${esc(log.user_name || "System")}</td><td>${esc(log.action)}</td><td>${esc(log.entity_type)} ${esc(log.entity_id || "")}</td><td>${esc(log.device_id || "—")}</td></tr>`).join("")}</table>` : `<div class="empty">No audit events yet.</div>`}</div>`;
}

async function viewDiagnostics() {
  const el = document.getElementById("view");
  const data = await api("/api/diagnostics");
  el.innerHTML = `<div class="topbar"><h1>Diagnostics</h1><span class="badge healthy">Healthy</span></div>
    <div class="stat-grid"><div class="stat"><div class="label">Database</div><div class="value">${data.database.connected ? "Connected" : "Unavailable"}</div><div class="sub">${data.database.tables} tables</div></div><div class="stat"><div class="label">Pending sync</div><div class="value">${data.sync.pending}</div></div><div class="stat"><div class="label">Sync errors</div><div class="value">${data.sync.error}</div></div><div class="stat"><div class="label">Conflicts</div><div class="value">${data.sync.conflict}</div></div></div>
    <div class="card"><h2>Runtime</h2><div class="list-item"><span>Platform</span><b>${esc(data.runtime.platform)}</b></div><div class="list-item"><span>Node runtime</span><b>${esc(data.runtime.node)}</b></div><div class="list-item"><span>Process ID</span><b>${data.runtime.pid}</b></div></div>`;
}

async function viewSettings() {
  const el = document.getElementById("view");
  const [gym, mobile] = await Promise.all([api("/api/settings/gym"), api("/api/mobile/setup")]);
  const mobileUrl = mobile.urls[0] || `${location.origin}`;
  el.innerHTML = `
  <div class="topbar"><div><span class="eyebrow">CONTROL CENTER</span><h1>Settings</h1><p class="muted">Configure the gym and connect phones on the private Wi-Fi.</p></div></div>
  <div class="grid2">
    <div class="card">
      <h2>Gym profile</h2>
      <form id="gf">
        <label>Gym name *</label><input name="name" required value="${esc(gym.name)}" />
        <label>Phone</label><input name="phone" value="${esc(gym.phone || "")}" />
        <label>Address</label><input name="address" value="${esc(gym.address || "")}" />
        <div class="form-row">
          <div><label>Currency</label>
            <select name="currencyCode">
              ${["PKR", "USD", "EUR", "GBP", "AED", "INR"].map((c) => `<option value="${c}" ${gym.currencyCode === c ? "selected" : ""}>${c}</option>`).join("")}
            </select></div>
          <div><label>Timezone</label><input name="timezone" value="${esc(gym.timezone)}" /></div>
        </div>
        <button class="btn primary" style="margin-top:14px">Save profile</button>
      </form>
    </div>
    <div class="card">
      <h2>Mobile connection</h2>
      <p class="muted">Connect phones to the same Wi-Fi as this desktop. Open this address on each phone, sign in, then choose <b>Add to Home screen</b>.</p>
      <div class="mobile-url">${esc(mobileUrl)}</div>
      <div class="mobile-qr">
        <img id="mobile-qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}" alt="QR code for the mobile URL" width="220" height="220" />
        <p class="muted">Scan this QR code with the phone camera. The phone must be connected to this gym's Wi-Fi.</p>
      </div>
      <div class="actions"><button class="btn primary" id="copy-mobile-url">Copy mobile URL</button><button class="btn" id="refresh-mobile-status">Refresh status</button></div>
      <div class="list-item"><span>Connected phones</span><b>${mobile.devices}</b></div>
      <div class="list-item"><span>Pending sync records</span><b>${mobile.sync.pending}</b></div>
      <div class="list-item"><span>Conflicts</span><b>${mobile.sync.conflict}</b></div>
      <p class="muted">If the phone cannot connect, allow Node.js through Windows Firewall on Private networks. Do not use this URL outside the gym network.</p>
    </div>
    <div class="card">
      <h2>Change my password</h2>
      <form id="pf">
        <label>Current password *</label>
        <div class="field-wrap">
          <input name="currentPassword" type="password" required />
          <button type="button" class="toggle-pass" data-target='{"name":"currentPassword"}'>Show</button>
        </div>
        <label>New password *</label>
        <div class="field-wrap">
          <input name="newPassword" type="password" required minlength="8" />
          <button type="button" class="toggle-pass" data-target='{"name":"newPassword"}'>Show</button>
        </div>
        <button class="btn primary" style="margin-top:14px">Update password</button>
      </form>
      <h2 style="margin-top:26px">Account</h2>
      <div class="list-item"><span>Signed in as</span><b>${esc(state.me.fullName)} (${esc(state.me.username)})</b></div>
      <div class="list-item"><span>Role</span><b>${esc(state.me.role)}</b></div>
    </div>
  </div>`;
  wirePasswordToggles(el);
  document.getElementById("copy-mobile-url").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(mobileUrl);
    toast("Mobile URL copied.", "success");
  });
  document.getElementById("refresh-mobile-status").addEventListener("click", () => void viewSettings());
  document.getElementById("gf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button.primary");
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${spinner(true)} Saving…`;
    const form = new FormData(e.target);
    try {
      await api("/api/settings/gym", {
        method: "PUT",
        body: {
          name: form.get("name"),
          phone: form.get("phone") || undefined,
          address: form.get("address") || undefined,
          currencyCode: form.get("currencyCode"),
          timezone: form.get("timezone") || undefined,
        },
      });
      state.gymName = form.get("name");
      state.currency = form.get("currencyCode");
      toast("Profile saved.", "success");
      renderShell();
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      toast(error.message, "danger");
    }
  });
  document.getElementById("pf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button.primary");
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${spinner(true)} Updating…`;
    const form = new FormData(e.target);
    try {
      await api("/api/settings/password", {
        method: "POST",
        body: { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") },
      });
      e.target.reset();
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      toast("Password updated.", "success");
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      toast(error.message, "danger");
    }
  });
}

void render();

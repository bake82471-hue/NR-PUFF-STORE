/* ============================================================
   GLOBAL CONFIG & HELPERS
============================================================ */

const API = "https://nr-store-backend.onrender.com";

let INSTAGRAM_USER = null;
let currentItemId = null;
let editingId = null;

// Smooth selectors
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Simple GET
async function apiGet(url) {
    const res = await fetch(API + url);
    return res.json();
}

// Authenticated requests
async function apiAuth(url, method, body) {
    const res = await fetch(API + url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + (localStorage.getItem("token") || "")
        },
        body: JSON.stringify(body)
    });
    return res.json();
}

/* ============================================================
   NAVBAR ACTIVE STATE
============================================================ */

function setActiveNav() {
    const path = window.location.pathname;
    $$(".nav-btn").forEach(btn => btn.classList.remove("active-nav"));

    if (path.includes("index") || path.endsWith("/") || path.endsWith("NR-PUFF-STORE") || path.endsWith("NR-PUFF-STORE/")) {
        $$(".nav-btn")[0]?.classList.add("active-nav");
    }
    if (path.includes("item")) {
        $$(".nav-btn")[1]?.classList.add("active-nav");
    }
}
document.addEventListener("DOMContentLoaded", setActiveNav);

/* ============================================================
   3D PARALLAX EFFECT FOR CARDS
============================================================ */

document.addEventListener("mousemove", (e) => {
    $$(".card").forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        card.style.transform = `
            perspective(800px)
            rotateY(${x / 40}deg)
            rotateX(${-y / 40}deg)
            translateY(-10px)
            scale(1.05)
        `;
    });
});

document.addEventListener("mouseleave", () => {
    $$(".card").forEach(card => {
        card.style.transform = "";
    });
});

/* ============================================================
   LOADING SCREEN (optional)
============================================================ */

window.addEventListener("load", () => {
    const loader = $("#loader");
    if (loader) loader.classList.add("hide-loader");
});

/* ============================================================
   QUANTITY SELECTOR (NEW UI, A1 BEHAVIOR)
============================================================ */

function ensureHiddenQtyInput() {
    let hidden = $("#qty");
    if (!hidden) {
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.id = "qty";
        hidden.value = "1";
        const qtyBox = $(".qty-box") || document.body;
        qtyBox.appendChild(hidden);
    }
    return hidden;
}

function setupQuantitySelector(stock, onChange) {
    const selector = $("#qty-selector");
    const optionsBox = $("#qty-options");
    if (!selector || !optionsBox) return;

    const hidden = ensureHiddenQtyInput();

    selector.textContent = stock > 0 ? "1" : "0";
    hidden.value = stock > 0 ? "1" : "0";

    optionsBox.innerHTML = "";
    for (let i = 1; i <= stock; i++) {
        const opt = document.createElement("div");
        opt.textContent = i;
        opt.onclick = () => {
            selector.textContent = i;
            hidden.value = i;
            optionsBox.style.display = "none";
            if (typeof onChange === "function") onChange(i);
        };
        optionsBox.appendChild(opt);
    }

    selector.onclick = () => {
        if (stock <= 0) return;
        optionsBox.style.display =
            optionsBox.style.display === "block" ? "none" : "block";
    };
}

/* ============================================================
   ADMIN LOGIN & DASHBOARD INIT
============================================================ */

async function adminLogin() {
    const username = $("#admin-user")?.value;
    const password = $("#admin-pass")?.value;

    const res = await fetch(API + "/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        document.body.style.opacity = "0";
        setTimeout(() => location.reload(), 200);
    } else {
        alert("Credenziali errate");
    }
}

function initAdminPage() {
    const loginBox = $("#login-box");
    const dashboard = $("#dashboard");
    if (!loginBox || !dashboard) return;

    const token = localStorage.getItem("token");

    if (token) {
        loginBox.style.display = "none";
        dashboard.style.display = "block";

        dashboard.style.opacity = "0";
        setTimeout(() => dashboard.style.opacity = "1", 50);

        loadAdminProducts();
        loadInstagramSetting();
    } else {
        loginBox.style.display = "block";
        dashboard.style.display = "none";
    }
}

/* ============================================================
   ADMIN — INSTAGRAM SETTINGS (BACKEND)
============================================================ */

async function loadInstagramSetting() {
    const instaInput = $("#insta-user");
    if (!instaInput) return;

    try {
        const settings = await apiGet("/settings");
        instaInput.value = settings.instagram_username || "";
    } catch (err) {
        console.error("Failed to load Instagram settings", err);
    }
}

async function saveInstagram() {
    const instaInput = $("#insta-user");
    if (!instaInput) return;

    await apiAuth("/settings", "PUT", {
        instagram_username: instaInput.value
    });

    instaInput.style.boxShadow = "0 0 20px rgba(160,32,240,0.8)";
    setTimeout(() => instaInput.style.boxShadow = "none", 600);
}

/* ============================================================
   ADMIN — ADD / EDIT PRODUCT (BACKEND)
============================================================ */

function resetForm() {
    editingId = null;

    const formTitle = $("#form-title");
    const cancelBtn = $("#cancel-edit");

    if (formTitle) formTitle.innerText = "Aggiungi Prodotto";
    if (cancelBtn) cancelBtn.style.display = "none";

    ["p-name", "p-desc", "p-price", "p-stock", "p-image", "p-image-file"].forEach(id => {
        const el = $("#" + id);
        if (el) el.value = "";
    });

    const previewBox = $("#preview-box");
    if (previewBox) previewBox.style.display = "none";
}

async function submitItem() {
    if (editingId) {
        await updateItem(editingId);
    } else {
        await addItem();
    }
}

async function uploadImageIfNeeded() {
    const fileInput = $("#p-image-file");
    if (!fileInput || fileInput.files.length === 0) return null;

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const res = await fetch(API + "/upload", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + (localStorage.getItem("token") || "")
        },
        body: formData
    });

    const data = await res.json();
    return data.url;
}

async function addItem() {
    const name = $("#p-name")?.value;
    const desc = $("#p-desc")?.value;
    const price = $("#p-price")?.value;
    const stock = $("#p-stock")?.value;
    let imageUrl = $("#p-image")?.value || "";

    const uploaded = await uploadImageIfNeeded();
    if (uploaded) imageUrl = uploaded;

    await apiAuth("/items", "POST", {
        name,
        description: desc,
        price,
        stock,
        image: imageUrl
    });

    resetForm();
    loadAdminProducts();
}

async function updateItem(id) {
    const name = $("#p-name")?.value;
    const desc = $("#p-desc")?.value;
    const price = $("#p-price")?.value;
    const stock = $("#p-stock")?.value;
    let imageUrl = $("#p-image")?.value || "";

    const uploaded = await uploadImageIfNeeded();
    if (uploaded) imageUrl = uploaded;

    await apiAuth("/items/" + id, "PUT", {
        name,
        description: desc,
        price,
        stock,
        image: imageUrl
    });

    resetForm();
    loadAdminProducts();
}

async function deleteItem(id) {
    if (!confirm("Vuoi davvero eliminare questo prodotto?")) return;
    await apiAuth("/items/" + id, "DELETE");
    loadAdminProducts();
}

/* ============================================================
   ADMIN — PRODUCT LIST (BACKEND + NEW UI CARD STYLE)
============================================================ */

async function loadAdminProducts() {
    const box = $("#admin-products");
    if (!box) return;

    const products = await apiGet("/items");
    box.innerHTML = "";

    products.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.style.opacity = "0";

        div.innerHTML = `
            <b>${p.name}</b><br>
            Prezzo: ${p.price}€<br>
            Stock: ${p.stock}<br>
            ${p.image ? `<img src="${p.image}"><br>` : ""}
            <button onclick="editItem(${p.id})" class="btn">Modifica</button>
            <button onclick="deleteItem(${p.id})" class="btn btn-red">Elimina</button>
        `;

        box.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "1";
        }, i * 80);
    });
}

async function editItem(id) {
    const item = await apiGet("/items/" + id);
    editingId = id;

    const formTitle = $("#form-title");
    const cancelBtn = $("#cancel-edit");

    if (formTitle) formTitle.innerText = "Modifica Prodotto";
    if (cancelBtn) cancelBtn.style.display = "inline-block";

    $("#p-name").value = item.name;
    $("#p-desc").value = item.description;
    $("#p-price").value = item.price;
    $("#p-stock").value = item.stock;
    $("#p-image").value = item.image || "";

    const previewImg = $("#preview-img");
    const previewBox = $("#preview-box");

    if (item.image && previewImg && previewBox) {
        previewImg.src = item.image;
        previewBox.style.display = "block";
        previewBox.style.opacity = "0";
        setTimeout(() => previewBox.style.opacity = "1", 50);
    }
}

/* ============================================================
   ITEM PAGE — INSTAGRAM SETTINGS & STOCK
============================================================ */

async function loadInstagramUserForItem() {
    try {
        const settings = await apiGet("/settings");
        INSTAGRAM_USER = settings.instagram_username || null;
    } catch {
        INSTAGRAM_USER = null;
    }
}

function getItemIdFromURL() {
    return new URLSearchParams(window.location.search).get("id");
}

/* ============================================================
   ITEM PAGE — MAIN LOGIC (BACKEND + NEW UI)
============================================================ */

async function loadItemPage() {
    const imgEl = $("#item-img");
    if (!imgEl) return;

    currentItemId = getItemIdFromURL();
    if (!currentItemId) return;

    const item = await apiGet("/items/" + currentItemId);
    await loadInstagramUserForItem();

    imgEl.src = item.image || "";
    $("#item-name").innerText = item.name;
    $("#item-desc").innerText = item.description;
    $("#item-price").innerText = item.price + "€";
    $("#item-stock").innerText = item.stock;

    const orderBtn = $("#order-btn");
    const qtySelector = $("#qty-selector");

    ensureHiddenQtyInput();

    if (item.stock <= 0) {
        if (qtySelector) qtySelector.textContent = "0";
        $("#qty").value = "0";
        if (orderBtn) {
            orderBtn.innerText = "Non disponibile";
            orderBtn.disabled = true;
        }
    } else {
        setupQuantitySelector(item.stock, (qty) => {
            updateOrderButton(item, qty);
        });
        updateOrderButton(item, 1);
    }

    loadComments(currentItemId);

    const container = $("#item-container");
    if (container) {
        container.style.opacity = "0";
        setTimeout(() => {
            container.style.opacity = "1";
        }, 50);
    }
}

function updateOrderButton(item, qty) {
    const orderBtn = $("#order-btn");
    if (!orderBtn) return;

    const total = qty * item.price;
    orderBtn.innerText = `Ordina su Instagram (${qty} x ${item.price}€ = ${total}€)`;

    orderBtn.onclick = async () => {
        if (!INSTAGRAM_USER) {
            alert("Username Instagram non configurato.");
            return;
        }

        await reduceStock(item.id, qty);
        window.location.href = `https://instagram.com/${INSTAGRAM_USER}`;
    };
}

async function reduceStock(id, qty) {
    try {
        await apiAuth(`/items/${id}/stock`, "PUT", { qty });

        const newItem = await apiGet("/items/" + id);
        $("#item-stock").innerText = newItem.stock;

        const orderBtn = $("#order-btn");
        const qtySelector = $("#qty-selector");

        if (newItem.stock <= 0) {
            if (qtySelector) qtySelector.textContent = "0";
            $("#qty").value = "0";
            if (orderBtn) {
                orderBtn.disabled = true;
                orderBtn.innerText = "Non disponibile";
            }
        } else {
            setupQuantitySelector(newItem.stock, (q) => {
                updateOrderButton(newItem, q);
            });
            updateOrderButton(newItem, Math.min(parseInt($("#qty").value || "1", 10), newItem.stock));
        }
    } catch (err) {
        console.error("Errore aggiornamento stock", err);
    }
}

/* ============================================================
   COMMENTS SYSTEM (BACKEND)
============================================================ */

async function loadComments(itemId) {
    const box = $("#comments");
    if (!box) return;

    let comments = [];

    try {
        const res = await fetch(`${API}/comments/${itemId}`);
        comments = await res.json();
    } catch {
        comments = [];
    }

    box.innerHTML = "";

    if (!Array.isArray(comments) || comments.length === 0) {
        box.innerHTML = "<p>Nessun commento.</p>";
        return;
    }

    comments.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.style.opacity = "0";

        div.innerHTML = `
            <b>${c.username}</b><span style="opacity:0.6;"> (${c.date})</span>
            <p>${c.comment}</p>
        `;

        box.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "1";
        }, i * 80);
    });
}

async function sendComment() {
    const username = $("#c-username")?.value.trim();
    const comment = $("#c-text")?.value.trim();

    if (!username || !comment) {
        alert("Inserisci nome e commento");
        return;
    }

    try {
        await fetch(`${API}/comments/${currentItemId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, comment })
        });
    } catch { }

    loadComments(currentItemId);

    $("#c-username").value = "";
    $("#c-text").value = "";
}

/* ============================================================
   HOME PAGE — LOAD PRODUCTS (BACKEND + NEW CARD UI)
============================================================ */

async function loadHomePage() {
    const grid = $("#home-grid");
    if (!grid) return;

    const products = await apiGet("/items");
    grid.innerHTML = "";

    products.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "card";
        div.style.opacity = "0";

        div.onclick = () => location.href = `item.html?id=${p.id}`;

        div.innerHTML = `
            <img src="${p.image}">
            <h3 class="card-title">${p.name}</h3>
            <p class="card-price">${p.price}€</p>
            <div class="stock-badge">Stock: ${p.stock} pezzi</div>
        `;

        grid.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "1";
        }, i * 80);
    });
}

/* ============================================================
   PAGE INITIALIZATION
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("admin")) initAdminPage();
    if (path.includes("item")) loadItemPage();

    if (
        path.includes("index") ||
        path.endsWith("/") ||
        path.endsWith("NR-PUFF-STORE") ||
        path.endsWith("NR-PUFF-STORE/")
    ) {
        loadHomePage();
    }
});

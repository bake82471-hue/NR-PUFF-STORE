// ======================
// CONFIG
// ======================
const API = "https://nr-store-backend.onrender.com";

let INSTAGRAM_USER = null;
let currentItemId = null;
let editingId = null;


// ======================
// BASIC API HELPERS
// ======================
async function apiGet(url) {
    const res = await fetch(API + url);
    return res.json();
}

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


// ======================
// ADMIN AUTH
// ======================
async function adminLogin() {
    const username = document.getElementById("admin-user")?.value;
    const password = document.getElementById("admin-pass")?.value;

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
    const loginBox = document.getElementById("login-box");
    const dashboard = document.getElementById("dashboard");

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


// ======================
// INSTAGRAM SETTINGS
// ======================
async function loadInstagramSetting() {
    const instaInput = document.getElementById("insta-user");
    if (!instaInput) return;

    try {
        const settings = await apiGet("/settings");
        instaInput.value = settings.instagram_username || "";
    } catch (err) {
        console.error("Failed to load Instagram settings", err);
    }
}

async function saveInstagram() {
    const instaInput = document.getElementById("insta-user");
    if (!instaInput) return;

    await apiAuth("/settings", "PUT", {
        instagram_username: instaInput.value
    });

    instaInput.style.boxShadow = "0 0 20px rgba(160,32,240,0.8)";
    setTimeout(() => instaInput.style.boxShadow = "none", 600);
}


// ======================
// PRODUCT MANAGEMENT
// ======================
function resetForm() {
    editingId = null;

    document.getElementById("form-title").innerText = "Aggiungi Prodotto";
    document.getElementById("cancel-edit").style.display = "none";

    ["p-name", "p-desc", "p-price", "p-stock", "p-image", "p-image-file"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

    const previewBox = document.getElementById("preview-box");
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
    const fileInput = document.getElementById("p-image-file");
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
    const name = document.getElementById("p-name")?.value;
    const desc = document.getElementById("p-desc")?.value;
    const price = document.getElementById("p-price")?.value;
    const stock = document.getElementById("p-stock")?.value;
    let imageUrl = document.getElementById("p-image")?.value || "";

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
    const name = document.getElementById("p-name")?.value;
    const desc = document.getElementById("p-desc")?.value;
    const price = document.getElementById("p-price")?.value;
    const stock = document.getElementById("p-stock")?.value;
    let imageUrl = document.getElementById("p-image")?.value || "";

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

async function loadAdminProducts() {
    const box = document.getElementById("admin-products");
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

    document.getElementById("form-title").innerText = "Modifica Prodotto";
    document.getElementById("cancel-edit").style.display = "inline-block";

    document.getElementById("p-name").value = item.name;
    document.getElementById("p-desc").value = item.description;
    document.getElementById("p-price").value = item.price;
    document.getElementById("p-stock").value = item.stock;
    document.getElementById("p-image").value = item.image || "";

    const previewImg = document.getElementById("preview-img");
    const previewBox = document.getElementById("preview-box");

    if (item.image) {
        previewImg.src = item.image;
        previewBox.style.display = "block";
        previewBox.style.opacity = "0";
        setTimeout(() => previewBox.style.opacity = "1", 50);
    }
}


// ======================
// ITEM PAGE
// ======================
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

async function loadItemPage() {
    const imgEl = document.getElementById("item-img");
    if (!imgEl) return;

    currentItemId = getItemIdFromURL();
    if (!currentItemId) return;

    const item = await apiGet("/items/" + currentItemId);
    await loadInstagramUserForItem();

    imgEl.src = item.image || "";
    document.getElementById("item-name").innerText = item.name;
    document.getElementById("item-desc").innerText = item.description;
    document.getElementById("item-price").innerText = item.price + "€";
    document.getElementById("item-stock").innerText = item.stock;

    const qtyInput = document.getElementById("qty");
    const orderBtn = document.getElementById("order-btn");

    qtyInput.value = 1;
    qtyInput.min = 1;
    qtyInput.max = item.stock;

    if (item.stock <= 0) {
        qtyInput.value = 0;
        qtyInput.disabled = true;
        orderBtn.innerText = "Non disponibile";
        orderBtn.disabled = true;
    } else {
        updateOrderButton(item, 1);
        qtyInput.addEventListener("input", () => onQuantityChange(item));
    }

    loadComments(currentItemId);

    document.getElementById("item-container").style.opacity = "0";
    setTimeout(() => {
        document.getElementById("item-container").style.opacity = "1";
    }, 50);
}

function onQuantityChange(item) {
    const qtyInput = document.getElementById("qty");
    let qty = parseInt(qtyInput.value, 10);

    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > item.stock) qty = item.stock;

    qtyInput.value = qty;
    updateOrderButton(item, qty);
}

function updateOrderButton(item, qty) {
    const orderBtn = document.getElementById("order-btn");
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

        document.getElementById("item-stock").innerText = newItem.stock;

        if (newItem.stock <= 0) {
            document.getElementById("qty").disabled = true;
            document.getElementById("order-btn").disabled = true;
            document.getElementById("order-btn").innerText = "Non disponibile";
        }
    } catch (err) {
        console.error("Errore aggiornamento stock", err);
    }
}


// ======================
// COMMENTS
// ======================
async function loadComments(itemId) {
    const box = document.getElementById("comments");
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
            <b>${c.username}</b> <span style="opacity:0.6;">(${c.date})</span>
            <p>${c.comment}</p>
        `;

        box.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "1";
        }, i * 80);
    });
}

async function sendComment() {
    const username = document.getElementById("c-username")?.value.trim();
    const comment = document.getElementById("c-text")?.value.trim();

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
    } catch {}

    loadComments(currentItemId);

    document.getElementById("c-username").value = "";
    document.getElementById("c-text").value = "";
}


// ======================
// HOME PAGE
// ======================
async function loadHomePage() {
    const grid = document.getElementById("home-grid");
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
            <h3>${p.name}</h3>
            <p>${p.price}€</p>
            <div class="stock-badge">Stock: ${p.stock} pezzi</div>
        `;

        grid.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "1";
        }, i * 80);
    });
}


// ======================
// PAGE INITIALIZATION
// ======================
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

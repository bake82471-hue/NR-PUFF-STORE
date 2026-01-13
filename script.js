// ======================
// CONFIG
// ======================
const API = "https://nr-store-backend.onrender.com";

let INSTAGRAM_USER = null;      // Loaded from /settings
let currentItemId = null;       // Used on item page


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
    const userInput = document.getElementById("admin-user");
    const passInput = document.getElementById("admin-pass");

    if (!userInput || !passInput) return;

    const username = userInput.value;
    const password = passInput.value;

    const res = await fetch(API + "/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        location.reload();
    } else {
        alert("Wrong credentials");
    }
}

function initAdminPage() {
    const loginBox = document.getElementById("login-box");
    const dashboard = document.getElementById("dashboard");

    if (!loginBox || !dashboard) return;

    const token = localStorage.getItem("token");

    if (token) {
        loginBox.style.display = "none";
        dashboard.style.display = "block";
        loadAdminProducts();
        loadInstagramSetting();
    } else {
        loginBox.style.display = "block";
        dashboard.style.display = "none";
    }
}


// ======================
// INSTAGRAM SETTINGS (ADMIN)
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
    alert("Saved");
}


// ======================
// PRODUCT MANAGEMENT (ADMIN)
// ======================
let editingId = null;

function resetForm() {
    editingId = null;

    const title = document.getElementById("form-title");
    const cancelBtn = document.getElementById("cancel-edit");
    const nameInput = document.getElementById("p-name");
    const descInput = document.getElementById("p-desc");
    const priceInput = document.getElementById("p-price");
    const stockInput = document.getElementById("p-stock");
    const imageInput = document.getElementById("p-image");
    const fileInput = document.getElementById("p-image-file");
    const previewBox = document.getElementById("preview-box");

    if (title) title.innerText = "Aggiungi Prodotto";
    if (cancelBtn) cancelBtn.style.display = "none";

    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";
    if (priceInput) priceInput.value = "";
    if (stockInput) stockInput.value = "";
    if (imageInput) imageInput.value = "";
    if (fileInput) fileInput.value = "";

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
        headers: { "Authorization": localStorage.getItem("token") || "" },
        body: formData
    });

    const data = await res.json();
    return data.url; // backend must return { url: "https://..." }
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

async function loadAdminProducts() {
    const box = document.getElementById("admin-products");
    if (!box) return;

    const products = await apiGet("/items");
    box.innerHTML = "";

    products.forEach(p => {
        box.innerHTML += `
            <div class="comment">
                <b>${p.name}</b><br>
                Prezzo: ${p.price}€<br>
                Stock: ${p.stock}<br>
                ${p.image ? `<img src="${p.image}" style="max-width:80px; margin-top:5px; border-radius:6px;"><br>` : ""}
                <button onclick="editItem(${p.id})" class="btn btn-purple glow" style="margin-top:10px;">
                    Modifica
                </button>
                <button onclick="deleteItem(${p.id})" class="btn btn-red glow" style="margin-top:10px;">
                    Elimina
                </button>
            </div>
        `;
    });
}

async function editItem(id) {
    const item = await apiGet("/items/" + id);
    editingId = id;

    const title = document.getElementById("form-title");
    const cancelBtn = document.getElementById("cancel-edit");
    const nameInput = document.getElementById("p-name");
    const descInput = document.getElementById("p-desc");
    const priceInput = document.getElementById("p-price");
    const stockInput = document.getElementById("p-stock");
    const imageInput = document.getElementById("p-image");
    const previewImg = document.getElementById("preview-img");
    const previewBox = document.getElementById("preview-box");

    if (title) title.innerText = "Modifica Prodotto";
    if (cancelBtn) cancelBtn.style.display = "inline-block";

    if (nameInput) nameInput.value = item.name;
    if (descInput) descInput.value = item.description;
    if (priceInput) priceInput.value = item.price;
    if (stockInput) stockInput.value = item.stock;
    if (imageInput) imageInput.value = item.image || "";

    if (previewImg && item.image) previewImg.src = item.image;
    if (previewBox && item.image) previewBox.style.display = "block";
}

async function deleteItem(id) {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
    await apiAuth("/items/" + id, "DELETE");
    loadAdminProducts();
}


// ======================
// ITEM PAGE: PRODUCT + QUANTITY + INSTAGRAM
// ======================
async function loadInstagramUserForItem() {
    try {
        const settings = await apiGet("/settings");
        INSTAGRAM_USER = settings.instagram_username || null;
    } catch (err) {
        console.error("Failed to load Instagram user for item page", err);
        INSTAGRAM_USER = null;
    }
}

function getItemIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadItemPage() {
    const imgEl = document.getElementById("item-img");
    const nameEl = document.getElementById("item-name");
    const descEl = document.getElementById("item-desc");
    const priceEl = document.getElementById("item-price");
    const stockEl = document.getElementById("item-stock");
    const qtyInput = document.getElementById("qty");
    const orderBtn = document.getElementById("order-btn");

    // If these don't exist, we're not on the item page
    if (!imgEl || !nameEl || !descEl || !priceEl || !stockEl || !qtyInput || !orderBtn) return;

    currentItemId = getItemIdFromURL();
    if (!currentItemId) return;

    const item = await apiGet("/items/" + currentItemId);
    await loadInstagramUserForItem();

    imgEl.src = item.image || "";
    nameEl.innerText = item.name;
    descEl.innerText = item.description;
    priceEl.innerText = item.price + "€";
    stockEl.innerText = item.stock;

    qtyInput.value = 1;
    qtyInput.min = 1;
    qtyInput.max = item.stock;

    if (item.stock <= 0) {
        qtyInput.value = 0;
        qtyInput.disabled = true;
        orderBtn.innerText = "Out of stock";
        orderBtn.disabled = true;
    } else {
        updateOrderButton(item, parseInt(qtyInput.value, 10));
        qtyInput.addEventListener("input", () => onQuantityChange(item));
    }

    // Load comments for this item
    loadComments(currentItemId);
}

function onQuantityChange(item) {
    const qtyInput = document.getElementById("qty");
    if (!qtyInput) return;

    let qty = parseInt(qtyInput.value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > item.stock) qty = item.stock;

    qtyInput.value = qty;
    updateOrderButton(item, qty);
}

function updateOrderButton(item, qty) {
    const orderBtn = document.getElementById("order-btn");
    if (!orderBtn) return;

    const total = qty * item.price;
    orderBtn.innerText = `Ordina su Instagram (${qty} x ${item.price}€ = ${total}€)`;

    orderBtn.onclick = () => {
        if (!INSTAGRAM_USER) {
            alert("Instagram username is not configured yet.");
            return;
        }

        window.location.href = `https://instagram.com/${INSTAGRAM_USER}`;
    };
}

async function loadComments(itemId) {
    const box = document.getElementById("comments");
    if (!box) return;

    let comments = [];

    try {
        const res = await fetch(`${API}/comments/${itemId}`);
        const data = await res.json();
        comments = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("Failed to load comments:", err);
        comments = [];
    }

    box.innerHTML = "";

    if (comments.length === 0) {
        box.innerHTML = "<p>No comments yet.</p>";
        return;
    }

    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `
            <b>${c.username}</b> <span style="opacity:0.6;">(${c.date})</span>
            <p>${c.comment}</p>
            <hr>
        `;
        box.appendChild(div);
    });
}


async function sendComment() {
    const nameInput = document.getElementById("c-username");
    const textInput = document.getElementById("c-text");
    const box = document.getElementById("comments");

    if (!nameInput || !textInput || !box || !currentItemId) return;

    const username = nameInput.value.trim();
    const comment = textInput.value.trim();

    if (!username || !comment) {
        alert("Enter your name and comment");
        return;
    }

    let updatedComments = [];

    try {
        const res = await fetch(`${API}/comments/${currentItemId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, comment })
        });

        const data = await res.json();
        updatedComments = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("Failed to send comment:", err);
        updatedComments = [];
    }

    box.innerHTML = "";

    if (updatedComments.length === 0) {
        box.innerHTML = "<p>No comments yet.</p>";
        return;
    }

    updatedComments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `
            <b>${c.username}</b> <span style="opacity:0.6;">(${c.date})</span>
            <p>${c.comment}</p>
            <hr>
        `;
        box.appendChild(div);
    });

    nameInput.value = "";
    textInput.value = "";
}


// ======================
// PAGE INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("admin")) {
        initAdminPage();
    }

    if (path.includes("item")) {
        loadItemPage();
    }
});


async function loadHomePage() {
    const grid = document.getElementById("home-grid");
    if (!grid) return;

    const products = await apiGet("/items");

    grid.innerHTML = "";

    products.forEach(p => {
        grid.innerHTML += `
            <div class="card" onclick="location.href='item.html?id=${p.id}'">
                <img src="${p.image}" class="card-img">
                <h3>${p.name}</h3>
                <p>${p.price}€</p>
            </div>
        `;
    });
}


document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (
        path.includes("index") ||
        path.endsWith("/") ||
        path.endsWith("NR-PUFF-STORE") ||
        path.endsWith("NR-PUFF-STORE/")
    ) {
        loadHomePage();
    }

    if (path.includes("admin")) {
        initAdminPage();
    }

    if (path.includes("item")) {
        loadItemPage();
    }
});

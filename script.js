// CONFIG
const API = "https://nr-store-backend.onrender.com";

// ----------------------
// AUTH
// ----------------------
async function adminLogin() {
    const username = document.getElementById("admin-user").value;
    const password = document.getElementById("admin-pass").value;

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
        alert("Credenziali errate");
    }
}

// Auto-login
if (localStorage.getItem("token")) {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadAdminProducts();
    loadInstagramSetting();
}

// ----------------------
// API HELPERS
// ----------------------
async function apiGet(url) {
    const res = await fetch(API + url);
    return res.json();
}

async function apiAuth(url, method, body) {
    const res = await fetch(API + url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": localStorage.getItem("token")
        },
        body: JSON.stringify(body)
    });
    return res.json();
}

// ----------------------
// INSTAGRAM SETTINGS
// ----------------------
async function loadInstagramSetting() {
    const settings = await apiGet("/settings");
    document.getElementById("insta-user").value = settings.instagram_username || "";
}

async function saveInstagram() {
    await apiAuth("/settings", "PUT", {
        instagram_username: document.getElementById("insta-user").value
    });
    alert("Salvato");
}

// ----------------------
// PRODUCT MANAGEMENT
// ----------------------
let editingId = null;

function resetForm() {
    editingId = null;

    document.getElementById("form-title").innerText = "Aggiungi Prodotto";
    document.getElementById("cancel-edit").style.display = "none";

    document.getElementById("p-name").value = "";
    document.getElementById("p-desc").value = "";
    document.getElementById("p-price").value = "";
    document.getElementById("p-stock").value = "";
    document.getElementById("p-image").value = "";
    document.getElementById("p-image-file").value = "";

    document.getElementById("preview-box").style.display = "none";
}

async function submitItem() {
    if (editingId) {
        updateItem(editingId);
    } else {
        addItem();
    }
}

async function uploadImageIfNeeded() {
    const fileInput = document.getElementById("p-image-file");
    if (fileInput.files.length === 0) return null;

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const res = await fetch(API + "/upload", {
        method: "POST",
        headers: { "Authorization": localStorage.getItem("token") },
        body: formData
    });

    const data = await res.json();
    return data.url;
}

async function addItem() {
    let imageUrl = document.getElementById("p-image").value;
    const uploaded = await uploadImageIfNeeded();
    if (uploaded) imageUrl = uploaded;

    await apiAuth("/items", "POST", {
        name: document.getElementById("p-name").value,
        description: document.getElementById("p-desc").value,
        price: document.getElementById("p-price").value,
        stock: document.getElementById("p-stock").value,
        image: imageUrl
    });

    resetForm();
    loadAdminProducts();
}

async function updateItem(id) {
    let imageUrl = document.getElementById("p-image").value;
    const uploaded = await uploadImageIfNeeded();
    if (uploaded) imageUrl = uploaded;

    await apiAuth("/items/" + id, "PUT", {
        name: document.getElementById("p-name").value,
        description: document.getElementById("p-desc").value,
        price: document.getElementById("p-price").value,
        stock: document.getElementById("p-stock").value,
        image: imageUrl
    });

    resetForm();
    loadAdminProducts();
}

async function loadAdminProducts() {
    const products = await apiGet("/items");
    const box = document.getElementById("admin-products");

    box.innerHTML = "";

    products.forEach(p => {
        box.innerHTML += `
            <div class="comment">
                <b>${p.name}</b><br>
                Prezzo: ${p.price}€<br>
                Stock: ${p.stock}<br>
                <img src="${p.image}" style="max-width:80px; margin-top:5px; border-radius:6px;"><br>

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

    document.getElementById("form-title").innerText = "Modifica Prodotto";
    document.getElementById("cancel-edit").style.display = "inline-block";

    document.getElementById("p-name").value = item.name;
    document.getElementById("p-desc").value = item.description;
    document.getElementById("p-price").value = item.price;
    document.getElementById("p-stock").value = item.stock;
    document.getElementById("p-image").value = item.image;

    document.getElementById("preview-img").src = item.image;
    document.getElementById("preview-box").style.display = "block";
}

async function deleteItem(id) {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return;

    await apiAuth("/items/" + id, "DELETE");
    loadAdminProducts();
}
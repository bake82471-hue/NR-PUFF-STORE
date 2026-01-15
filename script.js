/* ============================================================
   GLOBAL HELPERS
============================================================ */

// Smooth selector
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Load saved data
const load = (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback;

// Save data
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

/* ============================================================
   NAVBAR ACTIVE STATE
============================================================ */
function setActiveNav() {
    const path = window.location.pathname;

    $$(".nav-btn").forEach(btn => btn.classList.remove("active-nav"));

    if (path.includes("index")) {
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
   PRODUCT SYSTEM
============================================================ */
let products = load("products", []);
let instaUser = load("instaUser", "");

/* ------------------ HOME PAGE ------------------ */
function loadHomeProducts() {
    const grid = $("#home-grid");
    if (!grid) return;

    grid.innerHTML = "";

    products.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "card";
        div.onclick = () => location.href = `item.html?id=${i}`;

        div.innerHTML = `
            <img src="${p.image}">
            <h3 class="card-title">${p.name}</h3>
            <p class="card-price">${p.price}€</p>
            <div class="stock-badge">Stock: ${p.stock}</div>
        `;

        grid.appendChild(div);
    });
}

/* ------------------ ITEM PAGE ------------------ */
function loadItemPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id === null) return;

    const p = products[id];
    if (!p) return;

    $("#item-img").src = p.image;
    $("#item-name").textContent = p.name;
    $("#item-desc").textContent = p.desc;
    $("#item-price").textContent = p.price + "€";
    $("#item-stock").textContent = p.stock;

    $("#order-btn").onclick = () => {
        const qty = $("#qty").value;
        window.open(`https://instagram.com/${instaUser}?text=I want to order ${qty}x ${p.name}`, "_blank");
    };

    loadComments(id);
}

/* ============================================================
   COMMENTS SYSTEM
============================================================ */
function loadComments(id) {
    const comments = load("comments_" + id, []);
    const box = $("#comments");

    box.innerHTML = "";

    comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-box";
        div.innerHTML = `<b>${c.user}</b><br>${c.text}`;
        box.appendChild(div);
    });
}

function sendComment() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const user = $("#c-username").value.trim();
    const text = $("#c-text").value.trim();

    if (!user || !text) return;

    const comments = load("comments_" + id, []);
    comments.push({ user, text });
    save("comments_" + id, comments);

    $("#c-username").value = "";
    $("#c-text").value = "";

    loadComments(id);
}

/* ============================================================
   ADMIN LOGIN
============================================================ */
function adminLogin() {
    const user = $("#admin-user").value;
    const pass = $("#admin-pass").value;

    if (user === "admin" && pass === "1234") {
        $("#login-box").style.display = "none";
        $("#dashboard").style.display = "block";
        loadAdminProducts();
    }
}

/* ============================================================
   ADMIN — INSTAGRAM SETTINGS
============================================================ */
function saveInstagram() {
    instaUser = $("#insta-user").value.trim();
    save("instaUser", instaUser);
}

/* ============================================================
   ADMIN — ADD / EDIT PRODUCT
============================================================ */
let editID = null;

function submitItem() {
    const name = $("#p-name").value.trim();
    const desc = $("#p-desc").value.trim();
    const price = $("#p-price").value;
    const stock = $("#p-stock").value;
    const imageFile = $("#p-image-file").files[0];
    const imageURL = $("#p-image").value.trim();

    if (!name || !desc || !price || !stock) return;

    let finalImage = imageURL;

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = () => {
            finalImage = reader.result;
            saveProduct(finalImage);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveProduct(finalImage);
    }
}

function saveProduct(finalImage) {
    const name = $("#p-name").value.trim();
    const desc = $("#p-desc").value.trim();
    const price = $("#p-price").value;
    const stock = $("#p-stock").value;

    const product = { name, desc, price, stock, image: finalImage };

    if (editID !== null) {
        products[editID] = product;
    } else {
        products.push(product);
    }

    save("products", products);
    resetForm();
    loadAdminProducts();
}

function resetForm() {
    editID = null;
    $("#form-title").textContent = "New Product";
    $("#p-name").value = "";
    $("#p-desc").value = "";
    $("#p-price").value = "";
    $("#p-stock").value = "";
    $("#p-image").value = "";
    $("#p-image-file").value = "";
    $("#preview-box").style.display = "none";
}

/* ============================================================
   ADMIN — PRODUCT LIST
============================================================ */
function loadAdminProducts() {
    const box = $("#admin-products");
    if (!box) return;

    box.innerHTML = "";

    products.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "comment-box";

        div.innerHTML = `
            <b>${p.name}</b><br>
            Price: ${p.price}€<br>
            Stock: ${p.stock}<br>
            <img src="${p.image}">
            <button class="btn" onclick="editItem(${i})">Edit</button>
            <button class="btn btn-red" onclick="deleteItem(${i})">Delete</button>
        `;

        box.appendChild(div);
    });
}

function editItem(i) {
    const p = products[i];
    editID = i;

    $("#form-title").textContent = "Edit Product";
    $("#p-name").value = p.name;
    $("#p-desc").value = p.desc;
    $("#p-price").value = p.price;
    $("#p-stock").value = p.stock;
    $("#p-image").value = p.image;

    $("#preview-img").src = p.image;
    $("#preview-box").style.display = "block";
}

function deleteItem(i) {
    products.splice(i, 1);
    save("products", products);
    loadAdminProducts();
}

/* ============================================================
   PAGE INITIALIZATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    loadHomeProducts();
    loadItemPage();
});

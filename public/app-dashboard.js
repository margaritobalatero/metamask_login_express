// === CRUD Operations ===
async function loadItems() {
  const res = await fetch("/api/items", { credentials: "include" });
  const items = await res.json();
  const tbody = document.getElementById("items");
  tbody.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.imageUrl ? `<img src="${item.imageUrl}">` : ""}</td>
      <td>${item.item}</td>
      <td>${item.description || ""}</td>
      <td>${item.quantity}</td>
      <td>${item.unit}</td>
      <td>${item.unitPrice.toLocaleString("en-PH",{style:"currency",currency:"PHP"})}</td>
      <td>${item.userId}</td>
      <td>
        <button onclick="showDetail('${item._id}')">Detail / Edit</button>
        <button onclick="deleteItem('${item._id}')">❌</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function addItem(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    item: form.item.value,
    description: form.description.value,
    quantity: Number(form.quantity.value),
    unit: form.unit.value,
    unitPrice: parseFloat(form.unitPrice.value),
    imageUrl: form.imageUrl.value,
  };
  await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  showToast("Item added");
  form.reset();
  loadItems();
}

async function deleteItem(id) {
  await fetch(`/api/items/${id}`, { method: "DELETE", credentials: "include" });
  showToast("Item deleted");
  loadItems();
}

// === Detail / Edit Modal with Live Image Preview and Dragging ===
let editId = null;

// Create modal
const modal = document.createElement("div");
modal.id = "modal";
Object.assign(modal.style, {
  display: "none",
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: "1000",
});

const modalContent = document.createElement("div");
Object.assign(modalContent.style, {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  width: "400px",
  maxWidth: "90%",
  position: "absolute",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  cursor: "move",
});
modal.appendChild(modalContent);

// Close button
const modalClose = document.createElement("span");
modalClose.textContent = "×";
Object.assign(modalClose.style, {
  position: "absolute",
  top: "10px",
  right: "15px",
  cursor: "pointer",
  fontSize: "22px",
  fontWeight: "bold",
});
modalContent.appendChild(modalClose);

// Image preview
const imgPreview = document.createElement("img");
Object.assign(imgPreview.style, {
  width: "100%",         // make it as wide as the modal content
  height: "auto",        // maintain aspect ratio
  marginBottom: "10px",
  display: "none",
  borderRadius: "8px",
  border: "1px solid #ccc",
  objectFit: "contain"   // show the whole image without cropping
});
modalContent.appendChild(imgPreview);


// Form
const editForm = document.createElement("form");
modalContent.appendChild(editForm);

// Input fields
const fields = ["item","description","quantity","unit","unitPrice","imageUrl"];
fields.forEach(name => {
  const input = document.createElement("input");
  input.name = name;
  input.placeholder = name.charAt(0).toUpperCase() + name.slice(1);
  input.style.cssText = "margin-bottom:8px; width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;";
  if(name==="quantity"||name==="unitPrice") input.type = "number";
  if(name==="unitPrice") input.step = "0.01";
  editForm.appendChild(input);

  // Live image preview
  if(name==="imageUrl"){
    input.addEventListener("input", e => {
      if(e.target.value){
        imgPreview.src = e.target.value;
        imgPreview.style.display = "block";
      } else {
        imgPreview.style.display = "none";
      }
    });
  }
});

const saveBtn = document.createElement("button");
saveBtn.type = "submit";
saveBtn.textContent = "Save Changes";
Object.assign(saveBtn.style, { width:"100%", padding:"10px", border:"none", borderRadius:"6px", background:"#ff9900", color:"#fff", cursor:"pointer" });
editForm.appendChild(saveBtn);

document.body.appendChild(modal);

// === Modal Events ===
modalClose.onclick = () => modal.style.display = "none";
window.onclick = e => { if(e.target === modal) modal.style.display="none"; };

// Drag functionality
let isDragging = false, offsetX = 0, offsetY = 0;
modalContent.addEventListener("mousedown", e => {
  isDragging = true;
  offsetX = e.clientX - modalContent.getBoundingClientRect().left;
  offsetY = e.clientY - modalContent.getBoundingClientRect().top;
});
window.addEventListener("mousemove", e => {
  if(isDragging){
    modalContent.style.left = (e.clientX - offsetX) + "px";
    modalContent.style.top = (e.clientY - offsetY) + "px";
  }
});
window.addEventListener("mouseup", () => { isDragging = false; });

async function showDetail(id){
  const res = await fetch("/api/items", { credentials: "include" });
  const items = await res.json();
  const item = items.find(i => i._id===id);
  if(!item) return;

  editId = item._id;
  editForm.item.value = item.item;
  editForm.description.value = item.description || "";
  editForm.quantity.value = item.quantity;
  editForm.unit.value = item.unit;
  editForm.unitPrice.value = item.unitPrice;
  editForm.imageUrl.value = item.imageUrl || "";

  if(item.imageUrl){
    imgPreview.src = item.imageUrl;
    imgPreview.style.display = "block";
  } else imgPreview.style.display = "none";

  modal.style.display = "flex";
}

editForm.onsubmit = async e => {
  e.preventDefault();
  const data = {
    item: editForm.item.value,
    description: editForm.description.value,
    quantity: Number(editForm.quantity.value),
    unit: editForm.unit.value,
    unitPrice: parseFloat(editForm.unitPrice.value),
    imageUrl: editForm.imageUrl.value,
  };
  await fetch(`/api/items/${editId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  showToast("Item updated");
  modal.style.display="none";
  loadItems();
};

// === Toast ===
function showToast(msg){
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "show";
  setTimeout(()=>toast.className=toast.className.replace("show",""),2000);
}

// === Initialize ===
if(document.getElementById("itemForm")){
  document.getElementById("itemForm").addEventListener("submit", addItem);
  loadItems();
}

// Logout
document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    const res = await fetch("/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json();
    if(data.ok){
      showToast("Logged out");
      setTimeout(() => {
        window.location.href = "/index.html"; // redirect to login page
      }, 1000);
    }
  } catch (err) {
    console.error(err);
    showToast("Logout failed");
  }
});


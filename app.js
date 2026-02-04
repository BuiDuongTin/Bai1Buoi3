const API_URL = "https://api.escuelajs.co/api/v1/products";

const state = {
  products: [],
  filtered: [],
  page: 1,
  pageSize: 10,
  search: "",
  sort: { field: null, dir: "asc" },
  selected: null,
};

const elements = {
  tableBody: document.getElementById("tableBody"),
  pagination: document.getElementById("pagination"),
  paginationInfo: document.getElementById("paginationInfo"),
  searchInput: document.getElementById("searchInput"),
  pageSize: document.getElementById("pageSize"),
  sortTitle: document.getElementById("sortTitle"),
  sortPrice: document.getElementById("sortPrice"),
  btnExport: document.getElementById("btnExport"),
  btnOpenCreate: document.getElementById("btnOpenCreate"),
  btnUpdate: document.getElementById("btnUpdate"),
  btnCreate: document.getElementById("btnCreate"),
  detailForm: document.getElementById("detailForm"),
  createForm: document.getElementById("createForm"),
  detailAlert: document.getElementById("detailAlert"),
  createAlert: document.getElementById("createAlert"),
};

const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
const createModal = new bootstrap.Modal(document.getElementById("createModal"));

async function fetchProducts() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu");
  }
  const data = await response.json();
  state.products = data;
  applyFilters();
}

function applyFilters() {
  const keyword = state.search.trim().toLowerCase();
  let data = [...state.products];

  if (keyword) {
    data = data.filter((item) => item.title.toLowerCase().includes(keyword));
  }

  if (state.sort.field) {
    const { field, dir } = state.sort;
    data.sort((a, b) => {
      const valA = field === "title" ? a.title.toLowerCase() : a.price;
      const valB = field === "title" ? b.title.toLowerCase() : b.price;
      if (valA < valB) return dir === "asc" ? -1 : 1;
      if (valA > valB) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  state.filtered = data;
  const totalPages = Math.max(1, Math.ceil(data.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  render();
}

function render() {
  renderTable();
  renderPagination();
  updateSortLabels();
}

function renderTable() {
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageItems = state.filtered.slice(start, end);

  elements.tableBody.innerHTML = pageItems
    .map((item) => {
      const categoryName = item.category?.name || "";
      const firstImage = Array.isArray(item.images) && item.images.length ? item.images[0] : "";
      return `
        <tr
          data-id="${item.id}"
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          data-bs-title="${escapeHtml(item.description || "")}">
          <td>${item.id}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>$${item.price}</td>
          <td>${escapeHtml(categoryName)}</td>
          <td>
            ${firstImage ? `<img class="image-thumb" src="${firstImage}" alt="${escapeHtml(item.title)}" />` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  elements.tableBody.querySelectorAll("[data-bs-toggle=\"tooltip\"]").forEach((el) => {
    bootstrap.Tooltip.getOrCreateInstance(el);
  });

  elements.tableBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      const id = Number(row.getAttribute("data-id"));
      const item = state.products.find((p) => p.id === id);
      if (item) openDetail(item);
    });
  });
}

function renderPagination() {
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  elements.paginationInfo.textContent = `Tổng ${total} items • Trang ${state.page}/${totalPages}`;

  const buttons = [];
  const createButton = (label, page, disabled = false, active = false) => {
    return `
      <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
        <button class="page-link" data-page="${page}">${label}</button>
      </li>
    `;
  };

  buttons.push(createButton("«", 1, state.page === 1));
  buttons.push(createButton("‹", Math.max(1, state.page - 1), state.page === 1));

  const start = Math.max(1, state.page - 2);
  const end = Math.min(totalPages, state.page + 2);
  for (let i = start; i <= end; i += 1) {
    buttons.push(createButton(String(i), i, false, i === state.page));
  }

  buttons.push(createButton("›", Math.min(totalPages, state.page + 1), state.page === totalPages));
  buttons.push(createButton("»", totalPages, state.page === totalPages));

  elements.pagination.innerHTML = buttons.join("");
  elements.pagination.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.getAttribute("data-page"));
      if (!Number.isNaN(page)) {
        state.page = page;
        render();
      }
    });
  });
}

function openDetail(item) {
  state.selected = item;
  elements.detailForm.title.value = item.title || "";
  elements.detailForm.price.value = item.price ?? 0;
  elements.detailForm.description.value = item.description || "";
  elements.detailForm.categoryId.value = item.category?.id ?? 1;
  elements.detailForm.images.value = Array.isArray(item.images) ? item.images.join(", ") : "";
  hideAlert(elements.detailAlert);
  detailModal.show();
}

function hideAlert(element) {
  element.classList.add("d-none");
  element.classList.remove("alert-success", "alert-danger");
}

function showAlert(element, message, type = "success") {
  element.textContent = message;
  element.classList.remove("d-none");
  element.classList.toggle("alert-success", type === "success");
  element.classList.toggle("alert-danger", type === "danger");
}

function parseImages(value) {
  return value
    .split(",")
    .map((img) => img.trim())
    .filter((img) => img.length > 0);
}

async function updateItem() {
  if (!state.selected) return;

  const payload = {
    title: elements.detailForm.title.value.trim(),
    price: Number(elements.detailForm.price.value),
    description: elements.detailForm.description.value.trim(),
    categoryId: Number(elements.detailForm.categoryId.value),
    images: parseImages(elements.detailForm.images.value),
  };

  try {
    const response = await fetch(`${API_URL}/${state.selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Cập nhật thất bại");
    }

    const updated = await response.json();
    const index = state.products.findIndex((p) => p.id === updated.id);
    if (index >= 0) state.products[index] = updated;
    applyFilters();
    showAlert(elements.detailAlert, "Cập nhật thành công", "success");
  } catch (error) {
    showAlert(elements.detailAlert, error.message || "Có lỗi xảy ra", "danger");
  }
}

async function createItem() {
  const payload = {
    title: elements.createForm.title.value.trim(),
    price: Number(elements.createForm.price.value),
    description: elements.createForm.description.value.trim(),
    categoryId: Number(elements.createForm.categoryId.value),
    images: parseImages(elements.createForm.images.value),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Tạo thất bại");
    }

    const created = await response.json();
    state.products.unshift(created);
    applyFilters();
    createFormReset();
    showAlert(elements.createAlert, "Tạo thành công", "success");
  } catch (error) {
    showAlert(elements.createAlert, error.message || "Có lỗi xảy ra", "danger");
  }
}

function createFormReset() {
  elements.createForm.reset();
  hideAlert(elements.createAlert);
}

function exportCsv() {
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageItems = state.filtered.slice(start, end);

  const header = ["id", "title", "price", "category", "images"];
  const rows = pageItems.map((item) => [
    item.id,
    item.title,
    item.price,
    item.category?.name || "",
    Array.isArray(item.images) ? item.images.join(" | ") : "",
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `products_page_${state.page}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.page = 1;
    applyFilters();
  });

  elements.pageSize.addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    applyFilters();
  });

  elements.sortTitle.addEventListener("click", () => {
    toggleSort("title");
  });

  elements.sortPrice.addEventListener("click", () => {
    toggleSort("price");
  });

  elements.btnExport.addEventListener("click", exportCsv);
  elements.btnOpenCreate.addEventListener("click", () => {
    createFormReset();
    createModal.show();
  });
  elements.btnUpdate.addEventListener("click", updateItem);
  elements.btnCreate.addEventListener("click", createItem);
}

function toggleSort(field) {
  if (state.sort.field === field) {
    state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
  } else {
    state.sort.field = field;
    state.sort.dir = "asc";
  }
  applyFilters();
}

function updateSortLabels() {
  const getLabel = (field, label) => {
    if (state.sort.field !== field) return `Sắp xếp theo ${label}`;
    return state.sort.dir === "asc"
      ? `Đang: ${label} (A→Z)`
      : `Đang: ${label} (Z→A)`;
  };

  elements.sortTitle.textContent = getLabel("title", "Tên");
  elements.sortPrice.textContent =
    state.sort.field !== "price"
      ? "Sắp xếp theo Giá"
      : state.sort.dir === "asc"
        ? "Đang: Giá (Thấp→Cao)"
        : "Đang: Giá (Cao→Thấp)";
}

fetchProducts().catch((error) => {
  elements.tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td>
    </tr>
  `;
});

setupEvents();

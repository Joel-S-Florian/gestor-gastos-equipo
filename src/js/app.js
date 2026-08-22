"use strict";

/* ================= Configuracion ================= */
const CATEGORIAS = [
    { id: "comida",     nombre: "Comida",      icono: "fa-utensils",       color: "#f59e0b" },
    { id: "transporte", nombre: "Transporte",  icono: "fa-bus",            color: "#3b82f6" },
    { id: "hogar",      nombre: "Hogar",       icono: "fa-house",          color: "#10b981" },
    { id: "salud",      nombre: "Salud",       icono: "fa-heart-pulse",    color: "#ef4444" },
    { id: "ocio",       nombre: "Ocio",        icono: "fa-gamepad",        color: "#8b5cf6" },
    { id: "educacion",  nombre: "Educacion",   icono: "fa-book",           color: "#06b6d4" },
    { id: "compras",    nombre: "Compras",     icono: "fa-bag-shopping",   color: "#ec4899" },
    { id: "otros",      nombre: "Otros",       icono: "fa-tag",            color: "#6b7280" }
];

const MONEDA = "S/ ";
const STORAGE_KEY = "gastos";
const THEME_KEY = "theme";

/* ================= Estado ================= */
let gastos = cargarGastos();
let chart = null;
let gastoAEliminar = null;

/* ================= Referencias DOM ================= */
const $ = (id) => document.getElementById(id);

const form = $("gasto-form");
const tbody = $("gastos-body");
const tfoot = $("gastos-foot");

/* ================= Utilidades ================= */
function cargarGastos() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return [];
        return data.map(normalizarGasto).filter(Boolean);
    } catch {
        return [];
    }
}

function normalizarGasto(g) {
    if (!g || typeof g !== "object") return null;
    return {
        id: typeof g.id === "string" ? g.id : crypto.randomUUID(),
        descripcion: String(g.descripcion || "Sin descripcion").slice(0, 80),
        monto: Number(g.monto) || 0,
        categoria: CATEGORIAS.some((c) => c.id === g.categoria) ? g.categoria : "otros",
        fecha: esFechaValida(g.fecha) ? g.fecha : new Date().toISOString().slice(0, 10)
    };
}

function esFechaValida(f) {
    return typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f) && !isNaN(new Date(f));
}

function guardar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gastos));
}

function formatearMonto(n) {
    return MONEDA + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function getCategoria(id) {
    return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

let toastTimer;
function toast(msg, tipo = "") {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (tipo === "error" ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ================= Render ================= */
function obtenerFiltrados() {
    const texto = $("buscar").value.trim().toLowerCase();
    const cat = $("filtro-categoria").value;
    const orden = $("orden").value;

    let lista = gastos.filter((g) => {
        const coincideTexto = !texto || g.descripcion.toLowerCase().includes(texto);
        const coincideCat = !cat || g.categoria === cat;
        return coincideTexto && coincideCat;
    });

    const comparadores = {
        "fecha-desc": (a, b) => b.fecha.localeCompare(a.fecha),
        "fecha-asc": (a, b) => a.fecha.localeCompare(b.fecha),
        "monto-desc": (a, b) => b.monto - a.monto,
        "monto-asc": (a, b) => a.monto - b.monto
    };
    lista.sort(comparadores[orden]);
    return lista;
}

function renderTabla() {
    const lista = obtenerFiltrados();
    tbody.innerHTML = "";
    $("tabla-empty").classList.toggle("hidden", lista.length > 0);
    $("gastos-table").classList.toggle("hidden", lista.length === 0);

    lista.forEach((g) => {
        const cat = getCategoria(g.categoria);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapar(g.descripcion)}</td>
            <td><span class="cat-badge" style="background:${cat.color}1a;color:${cat.color}">
                <i class="fa-solid ${cat.icono}"></i>${cat.nombre}</span></td>
            <td>${formatearFecha(g.fecha)}</td>
            <td class="monto col-right">${formatearMonto(g.monto)}</td>
            <td class="acciones">
                <button class="btn btn-sm edit" data-editar="${g.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm delete" data-borrar="${g.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });

    const total = lista.reduce((s, g) => s + g.monto, 0);
    tfoot.innerHTML = `<tr>
        <td colspan="3">Total mostrado</td>
        <td class="col-right">${formatearMonto(total)}</td><td></td></tr>`;
}

function renderStats() {
    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

    const total = gastos.reduce((s, g) => s + g.monto, 0);
    const delMes = gastos.filter((g) => g.fecha.startsWith(mesActual)).reduce((s, g) => s + g.monto, 0);
    const promedio = gastos.length ? total / gastos.length : 0;

    $("stat-total").textContent = formatearMonto(total);
    $("stat-month").textContent = formatearMonto(delMes);
    $("stat-avg").textContent = formatearMonto(promedio);
    $("stat-count").textContent = gastos.length;
}

function renderChart() {
    const porCategoria = {};
    gastos.forEach((g) => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto; });
    const hayDatos = Object.keys(porCategoria).length > 0;

    $("chart-empty").classList.toggle("hidden", hayDatos);
    document.querySelector(".chart-wrap").classList.toggle("hidden", !hayDatos);

    if (chart) { chart.destroy(); chart = null; }
    if (!hayDatos) return;

    const esOscuro = document.documentElement.dataset.theme === "dark";
    chart = new Chart($("chart-categorias"), {
        type: "doughnut",
        data: {
            labels: Object.keys(porCategoria).map((id) => getCategoria(id).nombre),
            datasets: [{
                data: Object.values(porCategoria),
                backgroundColor: Object.keys(porCategoria).map((id) => getCategoria(id).color),
                borderWidth: 2,
                borderColor: esOscuro ? "#171a23" : "#ffffff"
            }]
        },
        options: {
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: esOscuro ? "#9aa1af" : "#6b7280", boxWidth: 12, padding: 14 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${formatearMonto(ctx.raw)}`
                    }
                }
            }
        }
    });
}

function renderTodo() {
    renderTabla();
    renderStats();
    renderChart();
}

/* ================= Selectores de categorias ================= */
function poblarCategorias() {
    $("categoria").innerHTML = CATEGORIAS
        .map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
    $("filtro-categoria").innerHTML =
        `<option value="">Todas las categorias</option>` +
        CATEGORIAS.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
}

/* ================= Formulario ================= */
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const monto = parseFloat($("monto").value);
    if (!(monto > 0)) { toast("El monto debe ser mayor a cero", "error"); return; }

    const idEdicion = $("gasto-id").value;
    const datos = {
        descripcion: $("descripcion").value.trim(),
        monto,
        fecha: $("fecha").value,
        categoria: $("categoria").value
    };

    if (idEdicion) {
        const idx = gastos.findIndex((g) => g.id === idEdicion);
        if (idx !== -1) gastos[idx] = { ...gastos[idx], ...datos };
        toast("Gasto actualizado");
    } else {
        gastos.push({ id: crypto.randomUUID(), ...datos });
        toast("Gasto agregado");
    }

    salirModoEdicion();
    guardar();
    renderTodo();
});

$("btn-cancel").addEventListener("click", salirModoEdicion);

function iniciarEdicion(id) {
    const g = gastos.find((x) => x.id === id);
    if (!g) return;
    $("gasto-id").value = g.id;
    $("descripcion").value = g.descripcion;
    $("monto").value = g.monto;
    $("fecha").value = g.fecha;
    $("categoria").value = g.categoria;
    $("btn-submit").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar';
    $("btn-cancel").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function salirModoEdicion() {
    form.reset();
    $("gasto-id").value = "";
    $("fecha").valueAsDate = new Date();
    $("btn-submit").innerHTML = '<i class="fa-solid fa-plus"></i> Agregar';
    $("btn-cancel").classList.add("hidden");
}

/* ================= Eliminar con confirmacion ================= */
tbody.addEventListener("click", (e) => {
    const btnEdit = e.target.closest("[data-editar]");
    const btnDel = e.target.closest("[data-borrar]");
    if (btnEdit) iniciarEdicion(btnEdit.dataset.editar);
    if (btnDel) pedirConfirmacion(btnDel.dataset.borrar);
});

function pedirConfirmacion(id) {
    const g = gastos.find((x) => x.id === id);
    if (!g) return;
    gastoAEliminar = id;
    $("modal-text").textContent = `Se eliminara "${g.descripcion}" (${formatearMonto(g.monto)}). Esta accion no se puede deshacer.`;
    $("modal-confirm").classList.remove("hidden");
}

$("modal-cancel").addEventListener("click", cerrarModal);
$("modal-ok").addEventListener("click", () => {
    gastos = gastos.filter((g) => g.id !== gastoAEliminar);
    guardar();
    renderTodo();
    cerrarModal();
    toast("Gasto eliminado");
});
$("modal-confirm").addEventListener("click", (e) => {
    if (e.target === $("modal-confirm")) cerrarModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarModal();
});

function cerrarModal() {
    gastoAEliminar = null;
    $("modal-confirm").classList.add("hidden");
}

/* ================= Filtros y orden ================= */
["buscar", "filtro-categoria", "orden"].forEach((id) =>
    $(id).addEventListener("input", renderTabla)
);

/* ================= Exportar CSV ================= */
$("btn-exportar").addEventListener("click", () => {
    if (!gastos.length) { toast("No hay gastos para exportar", "error"); return; }

    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const filas = [
        ["Descripcion", "Categoria", "Fecha", "Monto"].map(esc).join(";")
    ];
    obtenerFiltrados().forEach((g) => {
        filas.push([
            esc(g.descripcion),
            esc(getCategoria(g.categoria).nombre),
            esc(g.fecha),
            g.monto.toFixed(2)
        ].join(";"));
    });

    const blob = new Blob(["\ufeff" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV exportado");
});

/* ================= Tema ================= */
function aplicarTema(tema) {
    document.documentElement.dataset.theme = tema;
    $("theme-toggle").innerHTML =
        tema === "dark"
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem(THEME_KEY, tema);
}

$("theme-toggle").addEventListener("click", () => {
    aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    renderChart();
});

/* ================= Init ================= */
poblarCategorias();
aplicarTema(localStorage.getItem(THEME_KEY) || "light");
salirModoEdicion();
renderTodo();

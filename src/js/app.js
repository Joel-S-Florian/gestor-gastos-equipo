const form = document.getElementById('gasto-form');
const body = document.getElementById('gastos-body');

let gastos = JSON.parse(localStorage.getItem('gastos')) || [];

function render() {
    body.innerHTML = '';
    gastos.forEach((g, index) => {
        body.innerHTML += `<tr>
            <td>${g.descripcion}</td>
            <td>${g.monto}</td>
            <td>${g.categoria}</td>
            <td><button class="delete" onclick="eliminar(${index})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    gastos.push({
        descripcion: document.getElementById('descripcion').value,
        monto: document.getElementById('monto').value,
        categoria: document.getElementById('categoria').value
    });
    localStorage.setItem('gastos', JSON.stringify(gastos));
    render();
    form.reset();
});

function eliminar(index) {
    gastos.splice(index, 1);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    render();
}

render();

import json
import os

FILE = "gastos.json"

def cargar_gastos():
    if not os.path.exists(FILE):
        return []
    with open(FILE, "r") as f:
        return json.load(f)

def guardar_gastos(gastos):
    with open(FILE, "w") as f:
        json.dump(gastos, f)

def agregar_gasto(monto, categoria):
    gastos = cargar_gastos()
    nuevo_gasto = {"id": len(gastos) + 1, "monto": monto, "categoria": categoria}
    gastos.append(nuevo_gasto)
    guardar_gastos(gastos)
    print("Gasto agregado")

def listar_gastos():
    gastos = cargar_gastos()
    for g in gastos:
        print(g)

def total_por_categoria():
    gastos = cargar_gastos()
    totales = {}
    for g in gastos:
        totales[g['categoria']] = totales.get(g['categoria'], 0) + g['monto']
    print(totales)

if __name__ == "__main__":
    # Ejemplo básico
    agregar_gasto(100, "comida")
    listar_gastos()
    total_por_categoria()

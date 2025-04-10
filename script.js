// Tu código JavaScript completo aquí
let clientes = JSON.parse(localStorage.getItem("clientes") || "[]");
let productosTemp = [];
let inversionEditada = false;

// Funciones como `confirmarCambioMonto()`, `formatValor()`, `formatearClientes()`, `agregarCliente()`, etc.
document.addEventListener("DOMContentLoaded", () => {
  const montoGuardado = localStorage.getItem("inversion");
  if (montoGuardado) {
    document.getElementById("montoInversion").value = '₡' + parseInt(montoGuardado).toLocaleString('es-CR');
    calcularBeneficios();
  }
  actualizarVista();
  setInterval(actualizarVista, 1000);
  agregarProductoCampo();
});

// Asegúrate de mover todas las funciones JavaScript al archivo `script.js`.
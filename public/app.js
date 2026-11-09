// URL base de la API REST
const API_URL = '/api';

// Elementos del DOM
const formAuth = document.getElementById('form-auth');
const inputUsername = document.getElementById('auth-username');
const inputPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnRegistro = document.getElementById('btn-registro');
const authMensaje = document.getElementById('auth-mensaje');

const seccionAuth = document.getElementById('seccion-auth');
const seccionFormulario = document.getElementById('seccion-formulario');
const nombreUsuarioDisplay = document.getElementById('nombre-usuario');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');

const formVehiculo = document.getElementById('form-vehiculo');
const listaVehiculos = document.getElementById('lista-vehiculos');
const btnRecargar = document.getElementById('btn-recargar');

// GESTIÓN DE SESIÓN Y TOKEN JWT

function obtenerToken() {
    return localStorage.getItem('token_jwt');
}

function guardarSesion(token, username) {
    localStorage.setItem('token_jwt', token);
    localStorage.setItem('usuario_nombre', username);
    actualizarVistaSesion();
}

function cerrarSesion() {
    localStorage.removeItem('token_jwt');
    localStorage.removeItem('usuario_nombre');
    actualizarVistaSesion();
    cargarVehiculos();
}

function actualizarVistaSesion() {
    const token = obtenerToken();
    const username = localStorage.getItem('usuario_nombre');

    if (token && username) {
        nombreUsuarioDisplay.innerHTML = `<i class="bi bi-person-circle"></i> Sesión: <strong>${username}</strong>`;
        btnCerrarSesion.style.display = 'inline-block';
        seccionAuth.style.display = 'none';
        seccionFormulario.style.display = 'block';
    } else {
        nombreUsuarioDisplay.innerHTML = '<i class="bi bi-person"></i> Modo Invitado (Solo Lectura)';
        btnCerrarSesion.style.display = 'none';
        seccionAuth.style.display = 'block';
        seccionFormulario.style.display = 'none';
    }
}

// Evento Registro
btnRegistro.addEventListener('click', async () => {
    const username = inputUsername.value.trim();
    const password = inputPassword.value.trim();

    if (!username || !password) {
        mostrarMensajeAuth('Por favor completa usuario y contraseña.', 'red');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensajeAuth(datos.mensaje + '. Ya puedes Iniciar Sesión.', '#16a34a');
        } else {
            mostrarMensajeAuth(datos.mensaje, '#dc2626');
        }
    } catch (error) {
        mostrarMensajeAuth('Error al conectar con el servidor', '#dc2626');
    }
});

// Evento Login
btnLogin.addEventListener('click', async () => {
    const username = inputUsername.value.trim();
    const password = inputPassword.value.trim();

    if (!username || !password) {
        mostrarMensajeAuth('Por favor completa usuario y contraseña.', 'red');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
            guardarSesion(datos.token, datos.username);
            inputUsername.value = '';
            inputPassword.value = '';
            authMensaje.textContent = '';
            cargarVehiculos();
        } else {
            mostrarMensajeAuth(datos.mensaje, '#dc2626');
        }
    } catch (error) {
        mostrarMensajeAuth('Error al conectar con el servidor', '#dc2626');
    }
});

btnCerrarSesion.addEventListener('click', cerrarSesion);

function mostrarMensajeAuth(texto, color) {
    authMensaje.textContent = texto;
    authMensaje.style.color = color;
}

// OPERACIONES CRUD DE VEHÍCULOS

// READ: Obtener vehículos desde MongoDB
async function cargarVehiculos() {
    listaVehiculos.innerHTML = '<p class="subtexto">Cargando inventario...</p>';

    try {
        const respuesta = await fetch(`${API_URL}/vehiculos`);
        const vehiculos = await respuesta.json();

        if (vehiculos.length === 0) {
            listaVehiculos.innerHTML = '<p class="subtexto">No hay vehículos registrados en el inventario aún.</p>';
            return;
        }

        listaVehiculos.innerHTML = '';
        const token = obtenerToken();

        vehiculos.forEach((v) => {
            const card = document.createElement('div');
            card.classList.add('vehiculo-card');

            // Botón eliminar con icono vectorial SVG
            const botonEliminarHTML = token
                ? `<button class="btn-peligro" onclick="eliminarVehiculo('${v._id}')"><i class="bi bi-trash"></i> Eliminar</button>`
                : '';

            card.innerHTML = `
                <div>
                    <h3><i class="bi bi-car-front"></i> ${v.marca} ${v.modelo}</h3>
                    <p class="vehiculo-info">
                        <strong>Año:</strong> ${v.anio}<br>
                        <strong>Color:</strong> ${v.color}
                    </p>
                    <div class="vehiculo-precio">$${v.precio.toLocaleString()} USD</div>
                </div>
                ${botonEliminarHTML}
            `;

            listaVehiculos.appendChild(card);
        });
    } catch (error) {
        listaVehiculos.innerHTML = '<p class="subtexto" style="color: #dc2626;">Error al cargar el inventario.</p>';
    }
}

// CREATE: Guardar nuevo vehículo (Enviando Token JWT)
formVehiculo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoVehiculo = {
        marca: document.getElementById('v-marca').value.trim(),
        modelo: document.getElementById('v-modelo').value.trim(),
        anio: Number(document.getElementById('v-anio').value),
        precio: Number(document.getElementById('v-precio').value),
        color: document.getElementById('v-color').value.trim()
    };

    const token = obtenerToken();
    if (!token) {
        alert('Debes iniciar sesión para agregar vehículos.');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/vehiculos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(nuevoVehiculo)
        });

        if (respuesta.ok) {
            formVehiculo.reset();
            cargarVehiculos();
        } else {
            const error = await respuesta.json();
            alert('Error al guardar: ' + error.mensaje);
        }
    } catch (error) {
        alert('Error al comunicar con el servidor.');
    }
});

// DELETE: Eliminar vehículo por ID
async function eliminarVehiculo(id) {
    if (!confirm('¿Confirmas que deseas eliminar este vehículo del inventario?')) {
        return;
    }

    const token = obtenerToken();
    try {
        const respuesta = await fetch(`${API_URL}/vehiculos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (respuesta.ok) {
            cargarVehiculos();
        } else {
            const error = await respuesta.json();
            alert('Error al eliminar: ' + error.mensaje);
        }
    } catch (error) {
        alert('Error al eliminar vehículo.');
    }
}

window.eliminarVehiculo = eliminarVehiculo;
btnRecargar.addEventListener('click', cargarVehiculos);

// Inicializar vista al abrir la página
actualizarVistaSesion();
cargarVehiculos();
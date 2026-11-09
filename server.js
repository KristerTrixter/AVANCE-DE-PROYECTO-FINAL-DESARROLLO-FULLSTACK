require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Servir los archivos estaticos del frontend desde la carpeta "public".
app.use(express.static('public'));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB'))
    .catch((error) => console.error('Error al conectar a MongoDB:', error.message));

// MODELOS DE DATOS

// Modelo de Usuario para autenticación
const usuarioSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// Modelo de Vehículo para el sector Automotriz
const vehiculoSchema = new mongoose.Schema({
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    anio: { type: Number, required: true },
    precio: { type: Number, required: true },
    color: { type: String, default: 'No especificado' }
});
const Vehiculo = mongoose.model('Vehiculo', vehiculoSchema);

// MIDDLEWARE PERSONALIZADO

// Verifica que la petición incluya un token JWT válido
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado: Token no proporcionado' });
    }

    try {
        const usuarioVerificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = usuarioVerificado;
        next(); // Permite continuar con la siguiente función de la ruta
    } catch (error) {
        return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    }
};

// RUTAS DE AUTENTICACIÓN

// Registro de usuario nuevo (encriptando contraseña con bcrypt)
app.post('/api/auth/registro', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' });
        }

        const usuarioExistente = await Usuario.findOne({ username });
        if (usuarioExistente) {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = new Usuario({ username, password: hashedPassword });
        await nuevoUsuario.save();

        res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

// Login de usuario y generación de Token JWT
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const usuario = await Usuario.findOne({ username });
        if (!usuario) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas (usuario no encontrado)' });
        }

        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas (contraseña incorrecta)' });
        }

        // Generamos el Token JWT firmado con JWT_SECRET
        const token = jwt.sign(
            { id: usuario._id, username: usuario.username },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            username: usuario.username
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
    }
});

// RUTAS CRUD PARA VEHÍCULOS

// READ: Obtener todos los vehículos
app.get('/api/vehiculos', async (req, res) => {
    try {
        const vehiculos = await Vehiculo.find();
        res.json(vehiculos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener vehículos', error: error.message });
    }
});

// CREATE: Crear un nuevo vehículo
app.post('/api/vehiculos', verificarToken, async (req, res) => {
    try {
        const { marca, modelo, anio, precio, color } = req.body;

        if (!marca || !modelo || !anio || !precio) {
            return res.status(400).json({ mensaje: 'Marca, modelo, año y precio son obligatorios' });
        }

        const nuevoVehiculo = new Vehiculo({ marca, modelo, anio, precio, color });
        await nuevoVehiculo.save();

        res.status(201).json({ mensaje: 'Vehículo agregado exitosamente', vehiculo: nuevoVehiculo });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear vehículo', error: error.message });
    }
});

// UPDATE: Actualizar un vehículo existente por su ID
app.put('/api/vehiculos/:id', verificarToken, async (req, res) => {
    try {
        const vehiculoActualizado = await Vehiculo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!vehiculoActualizado) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado' });
        }

        res.json({ mensaje: 'Vehículo actualizado exitosamente', vehiculo: vehiculoActualizado });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar vehículo', error: error.message });
    }
});

// DELETE: Eliminar un vehículo por su ID
app.delete('/api/vehiculos/:id', verificarToken, async (req, res) => {
    try {
        const vehiculoEliminado = await Vehiculo.findByIdAndDelete(req.params.id);

        if (!vehiculoEliminado) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado' });
        }

        res.json({ mensaje: 'Vehículo eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar vehículo', error: error.message });
    }
});

// Ruta de estado general
app.get('/api/estado', (req, res) => {
    res.json({ mensaje: 'Servidor y API Automotriz funcionando correctamente' });
});

// Inicialización del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor corriendo en http://localhost:' + PORT);
});

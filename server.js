const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Clave secreta para la autenticación
const SECRET_KEY = 'mi-clave-secreta';

// Ruta de directorios
const uploadDir = path.join(__dirname, 'uploads/videos');
const videoViewsPath = path.join(__dirname, 'uploads/video-views.json');

// Configuración inicial
function initialize() {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(videoViewsPath)) {
        fs.writeFileSync(videoViewsPath, JSON.stringify({}));
    }
}
initialize();

// Configuración de almacenamiento para Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Límite de tamaño a 50MB
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /mp4|mkv|avi|mov/;
        const isValidExt = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        const isValidMime = allowedExtensions.test(file.mimetype);
        if (isValidExt && isValidMime) cb(null, true);
        else cb(new Error('Solo se permiten archivos de video (mp4, mkv, avi, mov)'));
    },
});

// Middlewares
app.use(cors({ origin: 'http://localhost:5000', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(uploadDir));

// Funciones auxiliares
function getVideoViews() {
    return JSON.parse(fs.readFileSync(videoViewsPath, 'utf8'));
}

function saveVideoViews(data) {
    fs.writeFileSync(videoViewsPath, JSON.stringify(data, null, 2));
}

// Rutas

// Listar videos disponibles
app.get('/videos/list', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio de videos:', err);
            return res.status(500).json({ error: 'Error al obtener la lista de videos' });
        }
        const videoFiles = files.filter(file => /\.(mp4|mkv|avi|mov)$/.test(file));
        res.status(200).json(videoFiles);
    });
});

// Incrementar vistas de un video
app.post('/videos/increment-view', (req, res) => {
    const { video } = req.body;
    if (!video) {
        return res.status(400).json({ error: 'El nombre del video es requerido.' });
    }

    try {
        const videoViews = getVideoViews();
        videoViews[video] = (videoViews[video] || 0) + 1;
        saveVideoViews(videoViews);
        res.status(200).json({ views: videoViews[video] });
    } catch (error) {
        console.error('Error al incrementar las vistas:', error);
        res.status(500).json({ error: 'Error interno del servidor al incrementar vistas.' });
    }
});

// Obtener vistas de un video
app.get('/videos/views/:video', (req, res) => {
    const video = req.params.video;
    try {
        const videoViews = getVideoViews();
        res.status(200).json({ views: videoViews[video] || 0 });
    } catch (error) {
        console.error('Error al obtener las vistas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Manejar "likes" de un video
const videoLikes = {};
app.post('/videos/like', (req, res) => {
    const { video } = req.body;
    if (!video) return res.status(400).json({ error: 'El nombre del video es obligatorio.' });

    videoLikes[video] = (videoLikes[video] || 0) + 1;
    res.status(200).json({ likes: videoLikes[video] });
});

app.get('/videos/likes', (req, res) => {
    const video = req.query.video;
    if (!video) return res.status(400).json({ error: 'El nombre del video es obligatorio.' });

    res.status(200).json({ likes: videoLikes[video] || 0 });
});

// Buscar videos
app.post('/search', (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'No se proporcionó una consulta de búsqueda.' });

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error al buscar videos:', err);
            return res.status(500).json({ error: 'Error al buscar videos.' });
        }
        const results = files.filter(file =>
            file.toLowerCase().includes(query.toLowerCase()) && /\.(mp4|mkv|avi|mov)$/.test(file)
        );
        res.status(200).json({ results });
    });
});

// Ruta para obtener una cantidad limitada de videos
app.get('/videos/limited', (req, res) => {
    const limit = parseInt(req.query.limit) || 10; // Por defecto, devuelve 10 videos

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio de videos:', err);
            return res.status(500).json({ error: 'Error al obtener la lista de videos' });
        }

        const videoFiles = files.filter(file => /\.(mp4|mkv|avi|mov)$/.test(file)).slice(0, limit);
        res.status(200).json(videoFiles);
    });
});

// Ruta para obtener videos con paginación
app.get('/videos/paginated', (req, res) => {
    const limit = parseInt(req.query.limit) || 10; // Número de videos por página
    const offset = parseInt(req.query.offset) || 0; // Desplazamiento inicial

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio de videos:', err);
            return res.status(500).json({ error: 'Error al obtener la lista de videos' });
        }

        const videoFiles = files.filter(file => /\.(mp4|mkv|avi|mov)$/.test(file));
        const paginatedVideos = videoFiles.slice(offset, offset + limit);
        res.status(200).json({ videos: paginatedVideos, hasMore: offset + limit < videoFiles.length });
    });
});


// Subir video
app.post('/upload', upload.single('video'), (req, res) => {
    const secretKey = req.headers['x-secret-key'];
    if (secretKey !== SECRET_KEY) {
        return res.status(403).json({ error: 'Acceso denegado. Clave secreta inválida.' });
    }

    try {
        const videoPath = req.file.path;
        res.status(200).json({ message: 'Video subido con éxito', videoPath });
    } catch (error) {
        console.error('Error al subir el video:', error);
        res.status(500).json({ error: 'Error al subir el video' });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

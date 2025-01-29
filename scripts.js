document.addEventListener('DOMContentLoaded', async () => {
    console.log('El DOM ha sido cargado.');

    const backendUrl = 'https://xzone.website'; // URL base del backend actualizada
    const videoGallery = document.getElementById('videoGallery');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadMoreButton = document.getElementById('loadMoreButton');
    const searchForm = document.getElementById('searchForm');
    let offset = 0; // Desplazamiento inicial
    const limit = 10; // Número de videos por carga

    // Inicializar partículas
    initializeParticles();

    // Configurar aviso para mayores de 18 años
    setupAgeWarning();

    // Configurar formulario de búsqueda
    setupSearchForm(searchForm);

    // Manejar búsqueda si hay un parámetro "query"
    const query = getQueryParameter('query');
    if (query && resultsContainer) {
        await handleSearch(query, resultsContainer, backendUrl);
    }

    // Cargar galería de videos en la página principal
    if (videoGallery) {
        await loadVideos(videoGallery, backendUrl, offset, limit);

        // Configurar botón "Cargar más videos"
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', async () => {
                offset += limit;
                await loadVideos(videoGallery, backendUrl, offset, limit);
            });
        }
    }
});

// Función para inicializar partículas
function initializeParticles() {
    particlesJS("particles-js", {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 800 } },
            color: { value: "#ff0000" },
            shape: { type: "circle", stroke: { width: 0, color: "#000000" } },
            opacity: { value: 0.5 },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#ff0000", opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2, out_mode: "out" },
        },
        interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" } },
        },
        retina_detect: true,
    });
}

// Función para configurar aviso de mayores de 18 años
function setupAgeWarning() {
    const ageWarning = document.getElementById('ageWarning');
    const closeWarningButton = document.getElementById('closeWarningButton');
    if (ageWarning && closeWarningButton) {
        closeWarningButton.addEventListener('click', () => {
            ageWarning.style.display = 'none';
        });
    }
}

// Función para configurar formulario de búsqueda
function setupSearchForm(searchForm) {
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                window.location.href = `/search-results.html?query=${encodeURIComponent(searchQuery)}`;
            }
        });
    } else {
        console.warn("No se encontró el formulario de búsqueda.");
    }
}

// Función para manejar búsqueda
async function handleSearch(query, resultsContainer, backendUrl) {
    resultsContainer.innerHTML = `<p>Buscando resultados para: <strong>${query}</strong>...</p>`;
    try {
        const response = await fetch(`${backendUrl}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) throw new Error('Error al realizar la búsqueda.');

        const data = await response.json();
        resultsContainer.innerHTML = '';

        if (data.results.length === 0) {
            resultsContainer.innerHTML = '<p>No se encontraron resultados.</p>';
        } else {
            data.results.forEach(video => {
                resultsContainer.appendChild(createVideoItem(video, backendUrl));
            });
        }
    } catch (error) {
        console.error('Error al realizar la búsqueda:', error);
        resultsContainer.innerHTML = `<p style="color: red;">Error al realizar la búsqueda: ${error.message}</p>`;
    }
}

// Función para cargar videos en la galería
async function loadVideos(videoGallery, backendUrl, offset, limit) {
    try {
        const response = await fetch(`${backendUrl}/videos/paginated?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Error al cargar videos.');

        const { videos, hasMore } = await response.json();

        videos.forEach(video => {
            videoGallery.appendChild(createVideoItem(video, backendUrl));
        });

        if (!hasMore) {
            const loadMoreButton = document.getElementById('loadMoreButton');
            if (loadMoreButton) loadMoreButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al cargar videos:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const videoGallery = document.getElementById('videoGallery');
    const backendUrl = 'https://xzone.website'; // URL base del backend actualizada

    if (videoGallery) {
        try {
            const limit = 10; // Cambia el número según lo que quieras mostrar
            const response = await fetch(`${backendUrl}/videos/limited?limit=${limit}`);
            if (!response.ok) throw new Error('No se pudo obtener la lista limitada de videos');

            const videos = await response.json();
            videoGallery.innerHTML = ''; // Limpiar el contenedor de la galería

            // Crear miniaturas de videos
            videos.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <a href="/video-player.html?video=${encodeURIComponent(video)}" class="video-link">
                        <video class="video-thumbnail" muted preload="metadata">
                            <source src="${backendUrl}/videos/${video}" type="video/mp4">
                            Tu navegador no soporta videos.
                        </video>
                        <div class="video-title">${video}</div>
                    </a>
                `;

                // Configurar un frame de preview para cada video
                const videoElement = videoItem.querySelector('.video-thumbnail');
                videoElement.addEventListener('loadedmetadata', () => {
                    videoElement.currentTime = 2; // Muestra el frame del segundo 2
                });

                videoGallery.appendChild(videoItem);
            });
        } catch (error) {
            console.error('Error al cargar los videos limitados:', error);
            videoGallery.innerHTML = '<p style="color: red;">Error al cargar los videos.</p>';
        }
    }
});

// Función para crear un elemento de video
function createVideoItem(video, backendUrl) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.innerHTML = `
        <a href="/video-player.html?video=${encodeURIComponent(video)}" class="video-link">
            <video class="video-thumbnail" muted preload="metadata">
                <source src="${backendUrl}/videos/${video}" type="video/mp4">
                Tu navegador no soporta videos.
            </video>
            <div class="video-title">${video}</div>
        </a>
    `;
    const videoElement = videoItem.querySelector('.video-thumbnail');
    videoElement.addEventListener('loadedmetadata', () => {
        videoElement.currentTime = 2; // Frame de preview
    });
    return videoItem;
}

// Función para obtener un parámetro de la URL
function getQueryParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function sync(field) {
    const val = document.getElementById('in-' + field).value;
    const outElem = document.getElementById('out-' + field);
    if(outElem) {
        if(field === 'fecha' && val) {
            const parts = val.split('-');
            if(parts.length === 3) {
                outElem.innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                outElem.innerText = val;
            }
        } else {
            outElem.innerText = val;
        }
    }
    
    saveState();
}

function setTodayIfEmpty() {
    const d = document.getElementById('in-fecha');
    if (!d.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        d.value = `${yyyy}-${mm}-${dd}`;
        sync('fecha');
    }
}

function loadFile(event, imgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(imgId);
            img.src = e.target.result;
            // Optionally, transparent background check for PNGs
            saveState();
        };
        reader.readAsDataURL(file);
    }
}

function limpiar() {
    if(confirm("¿Estás seguro de que deseas limpiar todo el formulario y remover las imágenes?")) {
        const fields = ['clever', 'proyecto', 'pieza', 'propiedad', 'fecha', 'disenador', 'x', 'y', 'z', 'peso', 'tiempo', 'ruta', 'observaciones', 'material', 'impresora', 'modo', 'boquilla'];
        fields.forEach(f => {
            const input = document.getElementById('in-' + f);
            if(input) input.value = '';
            const out = document.getElementById('out-' + f);
            if(out) out.innerText = '';
        });

        const imgs = ['img-frente', 'img-lateral', 'img-superior', 'img-perspectiva'];
        imgs.forEach(i => {
           document.getElementById(i).src = ''; 
        });

        localStorage.removeItem('odp3d_state');
        setTodayIfEmpty(); // Reset date back to today instead of empty
    }
}

// Persist data in localStorage
function saveState() {
    const state = {
        clever: document.getElementById('in-clever').value,
        proyecto: document.getElementById('in-proyecto').value,
        pieza: document.getElementById('in-pieza').value,
        propiedad: document.getElementById('in-propiedad').value,
        fecha: document.getElementById('in-fecha').value,
        disenador: document.getElementById('in-disenador').value,
        x: document.getElementById('in-x').value,
        y: document.getElementById('in-y').value,
        z: document.getElementById('in-z').value,
        peso: document.getElementById('in-peso').value,
        tiempo: document.getElementById('in-tiempo').value,
        ruta: document.getElementById('in-ruta').value,
        material: document.getElementById('in-material').value,
        impresora: document.getElementById('in-impresora').value,
        modo: document.getElementById('in-modo').value,
        boquilla: document.getElementById('in-boquilla').value,
        observaciones: document.getElementById('in-observaciones').value,
        
        imgFrente: document.getElementById('img-frente').src,
        imgLateral: document.getElementById('img-lateral').src,
        imgSuperior: document.getElementById('img-superior').src,
        imgPerspectiva: document.getElementById('img-perspectiva').src
    };
    localStorage.setItem('odp3d_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('odp3d_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            
            // Text fields
            const fields = ['clever', 'proyecto', 'pieza', 'propiedad', 'fecha', 'disenador', 'x', 'y', 'z', 'peso', 'tiempo', 'ruta', 'material', 'impresora', 'modo', 'boquilla', 'observaciones'];
            fields.forEach(f => {
                if (state[f] !== undefined && document.getElementById('in-' + f)) {
                    document.getElementById('in-' + f).value = state[f];
                    // Trigger sync() intentionally for date formatting
                    sync(f);
                }
            });

            // Images
            const isValidDataURL = (str) => { return str && str.startsWith('data:image'); };
            const isValidHttp = (str) => { return str && str.startsWith('http'); };

            if (isValidDataURL(state.imgFrente) || isValidHttp(state.imgFrente)) document.getElementById('img-frente').src = state.imgFrente;
            if (isValidDataURL(state.imgLateral) || isValidHttp(state.imgLateral)) document.getElementById('img-lateral').src = state.imgLateral;
            if (isValidDataURL(state.imgSuperior) || isValidHttp(state.imgSuperior)) document.getElementById('img-superior').src = state.imgSuperior;
            if (isValidDataURL(state.imgPerspectiva) || isValidHttp(state.imgPerspectiva)) document.getElementById('img-perspectiva').src = state.imgPerspectiva;
            
        } catch (e) {
            console.error('Error cargando estado, restableciendo base.', e);
        }
    }
}

// Setup drop target on page for convenience and init load
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setTodayIfEmpty(); // Defaults to today if not loaded from state

    // Hook drag events to img-box
    const imgBoxes = document.querySelectorAll('.img-box, .logo-box');
    imgBoxes.forEach(box => {
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = '#4a90e2';
            box.style.background = '#e0f2fe';
        });
        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = '';
            box.style.background = '';
        });
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = '';
            box.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = box.querySelector('img');
                    img.src = evt.target.result;
                    saveState();
                };
                reader.readAsDataURL(file);
            }
        });
    });
});

const boquillasData = {
    "Fast":    { "single": "2.6mm", "double": "2.6mm", "mega": "N/A" },
    "Normal":  { "single": "2.6mm", "double": "2.6mm", "mega": "2.6mm" },
    "Quality": { "single": "1.8mm", "double": "1.8mm", "mega": "2.6mm" },
    "HighRes": { "single": "1.8mm", "double": "1.8mm", "mega": "N/A" }
};

function updateBoquilla() {
    const modo = document.getElementById('in-modo').value;
    const impresora = document.getElementById('in-impresora').value;
    
    let boquillaVal = boquillasData[modo][impresora];
    if (boquillaVal === "N/A" || !boquillaVal) {
        boquillaVal = "No Soportado";
    }
    
    document.getElementById('in-boquilla').value = boquillaVal;
    
    sync('modo');
    sync('impresora');
    sync('boquilla');
}

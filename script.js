/* ODP Maker 3D v2.0 · Studio Sync (The Palace Company) */

const TEXT_FIELDS = [
    'sistema', 'clever', 'proyecto', 'pieza', 'cantidad', 'propiedad',
    'fecha', 'disenador', 'x', 'y', 'z', 'peso', 'tiempo',
    'ruta', 'observaciones', 'material', 'height', 'width', 'boquilla'
];

const VIEW_SLOTS = ['img-frente', 'img-lateral', 'img-superior', 'img-perspectiva'];
const SLOT_LABELS = {
    'img-frente': 'Frente',
    'img-lateral': 'Lateral',
    'img-superior': 'Superior',
    'img-perspectiva': 'Perspectiva'
};

const BOQUILLAS_MAP = {
    Fast:    { single: '2.6mm', double: '2.6mm', mega: 'N/A' },
    Normal:  { single: '2.6mm', double: '2.6mm', mega: '2.6mm' },
    Quality: { single: '1.8mm', double: '1.8mm', mega: '2.6mm' },
    HighRes: { single: '1.8mm', double: '1.8mm', mega: 'N/A' }
};

let activeSlotId = 'img-frente';
let currentZoom = 1;
let lastClearedSnapshot = null;
let draggedSourceSlot = null;

function formatWidthLabel(val) {
    if (!val) return '';
    return val.charAt(0).toUpperCase() + val.slice(1);
}

function sync(field, skipSave = false) {
    const inputEl = document.getElementById('in-' + field);
    if (!inputEl) return;
    const val = inputEl.value;
    const outElem = document.getElementById('out-' + field);

    if (field === 'sistema') {
        const sys = val || 'PULSE';
        const lblFolio = document.getElementById('lbl-folio');
        const outSysLbl = document.getElementById('out-sistema-label');
        if (lblFolio) lblFolio.innerText = `Número de ${sys}`;
        if (outSysLbl) outSysLbl.innerText = `Número de ${sys}:`;
    } else if (field === 'fecha' && outElem) {
        if (val) {
            const parts = val.split('-');
            outElem.innerText = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : val;
        } else {
            outElem.innerText = '';
        }
    } else if (field === 'width' && outElem) {
        outElem.innerText = formatWidthLabel(val);
    } else if (field === 'cantidad' && outElem) {
        const qty = parseInt(val, 10);
        outElem.innerText = (!isNaN(qty) && qty > 0) ? String(qty) : '1';
    } else if (outElem) {
        outElem.innerText = val;
    }

    if (field === 'ruta') {
        updateQrFromRuta(val);
    }

    if (!skipSave) {
        saveState();
    }
}

function updateQrFromRuta(rawText) {
    const qrContainer = document.getElementById('qr-container');
    const qrHolder = document.getElementById('qr-svg-holder');
    if (!qrContainer || !qrHolder) return;

    const urlMatch = String(rawText || '').match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch && typeof qrcode === 'function') {
        try {
            const qr = qrcode(0, 'M');
            qr.addData(urlMatch[0]);
            qr.make();
            qrHolder.innerHTML = qr.createSvgTag({ scalable: true, margin: 1 });
            qrContainer.hidden = false;
            return;
        } catch (err) {
            console.warn('No se pudo generar QR:', err);
        }
    }
    qrContainer.hidden = true;
    qrHolder.innerHTML = '';
}

function setTodayIfEmpty() {
    const d = document.getElementById('in-fecha');
    if (d && !d.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        d.value = `${yyyy}-${mm}-${dd}`;
        sync('fecha', true);
    }
}

function updateBoquilla(skipSave = false) {
    const widthEl = document.getElementById('in-width');
    const heightEl = document.getElementById('in-height');
    const boquillaEl = document.getElementById('in-boquilla');
    const warnBox = document.getElementById('boquilla-warning');
    const warnCombo = document.getElementById('warn-combo');
    const pillBoquilla = document.getElementById('pill-boquilla');

    if (!widthEl || !heightEl || !boquillaEl) return;

    const width = widthEl.value;
    const height = heightEl.value;

    let boquillaVal = BOQUILLAS_MAP[height]?.[width];
    const isUnsupported = (!boquillaVal || boquillaVal === 'N/A');
    if (isUnsupported) {
        boquillaVal = 'No Soportado';
    }

    boquillaEl.value = boquillaVal;
    boquillaEl.classList.toggle('invalid-boquilla', isUnsupported);
    if (pillBoquilla) pillBoquilla.classList.toggle('invalid-stat', isUnsupported);

    if (warnBox) {
        warnBox.hidden = !isUnsupported;
        if (isUnsupported && warnCombo) {
            warnCombo.innerText = `${height} + ${formatWidthLabel(width)}`;
        }
    }

    sync('width', true);
    sync('height', true);
    sync('boquilla', skipSave);
}

function updateImageDisplayMode(skipSave = false) {
    const fit = document.getElementById('in-img-fit')?.value || 'cover';
    const bgMode = document.getElementById('in-img-bg')?.value || 'white';
    const bgMap = {
        dark: '#404040',
        light: '#f8fafc',
        white: '#ffffff'
    };
    document.documentElement.style.setProperty('--img-fit', fit);
    document.documentElement.style.setProperty('--img-bg', bgMap[bgMode] || '#ffffff');
    if (!skipSave) saveState();
}

function refreshImageBoxStates() {
    let loadedCount = 0;
    VIEW_SLOTS.forEach(slotId => {
        const img = document.getElementById(slotId);
        const box = img?.closest('.img-box');
        if (!img || !box) return;
        const src = img.getAttribute('src') || '';
        const hasImg = Boolean(src && (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('blob:')));
        box.classList.toggle('has-image', hasImg);
        if (hasImg) loadedCount++;
    });

    const badge = document.getElementById('views-count-badge');
    if (badge) badge.innerText = `${loadedCount}/4`;
}

function setActiveSlot(slotId) {
    if (!VIEW_SLOTS.includes(slotId)) return;
    activeSlotId = slotId;
    document.querySelectorAll('.img-box').forEach(box => {
        box.classList.toggle('active-slot', box.dataset.slot === slotId);
    });
    const labelEl = document.getElementById('active-slot-name');
    if (labelEl) labelEl.innerText = SLOT_LABELS[slotId] || 'Frente';
}

function advanceToNextEmptySlot(currentSlot) {
    const startIdx = VIEW_SLOTS.indexOf(currentSlot);
    for (let i = 1; i <= VIEW_SLOTS.length; i++) {
        const candidate = VIEW_SLOTS[(startIdx + i) % VIEW_SLOTS.length];
        const img = document.getElementById(candidate);
        const src = img?.getAttribute('src') || '';
        if (!src) {
            setActiveSlot(candidate);
            return;
        }
    }
}

function setSlotImage(slotId, dataUrl) {
    const img = document.getElementById(slotId);
    if (!img) return;
    img.setAttribute('src', dataUrl || '');
    refreshImageBoxStates();
    saveState();
}

function handleBoxClick(event, slotId, fileInputId) {
    if (event.target.closest('.img-actions')) return;
    setActiveSlot(slotId);
    const img = document.getElementById(slotId);
    const hasImg = Boolean(img && img.getAttribute('src'));
    if (!hasImg) {
        const fileInput = document.getElementById(fileInputId);
        if (fileInput) fileInput.click();
    }
}

function openFilePicker(event, fileInputId) {
    event.stopPropagation();
    const fileInput = document.getElementById(fileInputId);
    if (fileInput) fileInput.click();
}

function clearSingleImage(event, slotId) {
    event.stopPropagation();
    setSlotImage(slotId, '');
    setActiveSlot(slotId);
    showToast(`Vista "${SLOT_LABELS[slotId]}" eliminada.`);
}

function loadFile(event, imgId) {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            setSlotImage(imgId, e.target.result);
            advanceToNextEmptySlot(imgId);
            showToast(`Imagen cargada en ${SLOT_LABELS[imgId]}.`);
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function getStateObject() {
    const state = {
        version: '2.0',
        savedAt: new Date().toISOString()
    };
    TEXT_FIELDS.forEach(f => {
        const el = document.getElementById('in-' + f);
        if (el) state[f] = el.value;
    });
    state.imgFit = document.getElementById('in-img-fit')?.value || 'contain';
    state.imgBg = document.getElementById('in-img-bg')?.value || 'dark';
    state.imgFrente = document.getElementById('img-frente')?.getAttribute('src') || '';
    state.imgLateral = document.getElementById('img-lateral')?.getAttribute('src') || '';
    state.imgSuperior = document.getElementById('img-superior')?.getAttribute('src') || '';
    state.imgPerspectiva = document.getElementById('img-perspectiva')?.getAttribute('src') || '';
    return state;
}

function applyStateObject(state, skipSave = false) {
    if (!state || typeof state !== 'object') return;

    const defaults = {
        sistema: 'PULSE',
        cantidad: '1',
        material: 'Dimengel 90',
        height: 'Normal',
        width: 'single',
        imgFit: 'cover',
        imgBg: 'white'
    };

    TEXT_FIELDS.forEach(f => {
        const el = document.getElementById('in-' + f);
        if (!el) return;
        if (state[f] !== undefined && state[f] !== '') {
            el.value = state[f];
        } else if (defaults[f] !== undefined && !state[f]) {
            el.value = defaults[f];
        } else if (state[f] === '') {
            el.value = '';
        }
        sync(f, true);
    });

    if (document.getElementById('in-img-fit')) {
        document.getElementById('in-img-fit').value = state.imgFit || 'cover';
    }
    if (document.getElementById('in-img-bg')) {
        document.getElementById('in-img-bg').value = state.imgBg || 'white';
    }
    updateImageDisplayMode(true);
    updateBoquilla(true);

    const isValidImg = (str) => Boolean(str && (str.startsWith('data:image') || str.startsWith('http')));
    document.getElementById('img-frente')?.setAttribute('src', isValidImg(state.imgFrente) ? state.imgFrente : '');
    document.getElementById('img-lateral')?.setAttribute('src', isValidImg(state.imgLateral) ? state.imgLateral : '');
    document.getElementById('img-superior')?.setAttribute('src', isValidImg(state.imgSuperior) ? state.imgSuperior : '');
    document.getElementById('img-perspectiva')?.setAttribute('src', isValidImg(state.imgPerspectiva) ? state.imgPerspectiva : '');

    refreshImageBoxStates();
    if (!skipSave) saveState();
}

function saveState() {
    try {
        const state = getStateObject();
        localStorage.setItem('odp3d_state', JSON.stringify(state));
        const badge = document.getElementById('save-status');
        if (badge) {
            badge.innerText = 'Guardado';
            setTimeout(() => { badge.innerText = 'Listo'; }, 1200);
        }
    } catch (e) {
        console.warn('No se pudo guardar en localStorage (posible límite de cuota por imágenes grandes):', e);
        const badge = document.getElementById('save-status');
        if (badge) badge.innerText = 'Usa Guardar .odp3d';
    }
}

function loadState() {
    const saved = localStorage.getItem('odp3d_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            applyStateObject(state, true);
            return;
        } catch (e) {
            console.error('Error cargando estado previo, usando valores base:', e);
        }
    }
    // Sincronizar valores iniciales por defecto
    TEXT_FIELDS.forEach(f => sync(f, true));
    updateBoquilla(true);
    updateImageDisplayMode(true);
    refreshImageBoxStates();
}

function limpiar() {
    lastClearedSnapshot = getStateObject();

    const blankState = {
        sistema: document.getElementById('in-sistema')?.value || 'PULSE',
        clever: '',
        proyecto: '',
        pieza: '',
        cantidad: '1',
        propiedad: '',
        fecha: '',
        disenador: document.getElementById('in-disenador')?.value || 'Michelle Pous Alarcón',
        x: '',
        y: '',
        z: '',
        peso: '',
        tiempo: '',
        ruta: 'Y:\\Prod\\01 IMPRESORA MASSIVIT\\',
        observaciones: '',
        material: 'Dimengel 90',
        height: 'Normal',
        width: 'single',
        imgFit: document.getElementById('in-img-fit')?.value || 'contain',
        imgBg: document.getElementById('in-img-bg')?.value || 'dark',
        imgFrente: '',
        imgLateral: '',
        imgSuperior: '',
        imgPerspectiva: ''
    };

    applyStateObject(blankState, true);
    setTodayIfEmpty();
    saveState();
    setActiveSlot('img-frente');

    showToast('Formulario limpio para nueva ODP 3D.', 'Deshacer', () => {
        if (lastClearedSnapshot) {
            applyStateObject(lastClearedSnapshot);
            showToast('Se restauró la ODP anterior.');
        }
    });
}

function autoBuildPath() {
    const prop = (document.getElementById('in-propiedad')?.value || 'Propiedad').trim();
    const pieza = (document.getElementById('in-pieza')?.value || 'Pieza').trim();
    const rutaEl = document.getElementById('in-ruta');
    if (!rutaEl) return;
    rutaEl.value = `Y:\\Prod\\01 IMPRESORA MASSIVIT\\${prop}\\${pieza}`;
    sync('ruta');
    showToast('Ruta sugerida actualizada.');
}

function copyPath() {
    const ruta = document.getElementById('in-ruta')?.value || '';
    if (!ruta) return;
    navigator.clipboard?.writeText(ruta).then(() => {
        showToast('Ruta copiada al portapapeles.');
    });
}

function handlePrint() {
    const boquilla = document.getElementById('in-boquilla')?.value;
    if (boquilla === 'No Soportado') {
        const proceed = confirm('⚠️ La combinación actual de Height + Width marca "Boquilla: No Soportado". ¿Deseas imprimir de todas formas?');
        if (!proceed) return;
    }
    window.print();
}

/* ==================== EXPORTAR / IMPORTAR ARCHIVO .ODP3D ==================== */
function exportOdpFile() {
    const state = getStateObject();
    const sys = (state.sistema || 'PULSE').toUpperCase();
    const folio = (state.clever || 'SINFOLIO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pieza = (state.pieza || state.proyecto || 'Pieza3D').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ODP3D_${sys}-${folio}_${pieza}.odp3d`;

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Archivo guardado: ${filename}`);
}

function triggerOpenFile() {
    document.getElementById('file-odp-open')?.click();
}

function importOdpFile(event) {
    const file = event.target.files?.[0];
    if (file) readOdpJsonFile(file);
    event.target.value = '';
}

/* ==================== IMPORTAR CARPETA MASSIVIT SLICER ==================== */
function importMassivitFolder(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
        processMassivitFileList(files);
    }
    event.target.value = '';
}

function parseXmlTag(xmlText, tag) {
    const re = new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, 'i');
    const m = xmlText.match(re);
    return m ? m[1].trim() : null;
}

function processMassivitFileList(files) {
    // Buscar el XML principal que contiene <SlicingParameters> (excluyendo params.xml, ExtraData.xml, Notes.xml, SlicingSettings.xml)
    const ignoredXmls = new Set(['params.xml', 'extradata.xml', 'notes.xml', 'slicingsettings.xml']);
    let mainXmlFile = files.find(f => f.name.toLowerCase().endsWith('.xml') && !ignoredXmls.has(f.name.toLowerCase()));
    if (!mainXmlFile) {
        mainXmlFile = files.find(f => f.name.toLowerCase() === 'params.xml');
    }

    if (mainXmlFile) {
        const baseName = mainXmlFile.name.replace(/\.xml$/i, '');
        const reader = new FileReader();
        reader.onload = (e) => {
            const xml = e.target.result || '';
            if (baseName && baseName.toLowerCase() !== 'params') {
                document.getElementById('in-pieza').value = baseName;
                sync('pieza', true);
            }

            const minX = parseFloat(parseXmlTag(xml, 'AABBminX'));
            const maxX = parseFloat(parseXmlTag(xml, 'AABBmaxX'));
            const minY = parseFloat(parseXmlTag(xml, 'AABBminY'));
            const maxY = parseFloat(parseXmlTag(xml, 'AABBmaxY'));
            const printedZ = parseFloat(parseXmlTag(xml, 'PrintedHeight') || parseXmlTag(xml, 'zMax'));

            if (!isNaN(minX) && !isNaN(maxX)) {
                document.getElementById('in-x').value = (maxX - minX).toFixed(2);
                sync('x', true);
            }
            if (!isNaN(minY) && !isNaN(maxY)) {
                document.getElementById('in-y').value = (maxY - minY).toFixed(2);
                sync('y', true);
            }
            if (!isNaN(printedZ)) {
                document.getElementById('in-z').value = printedZ.toFixed(2);
                sync('z', true);
            }

            const totalMatCC = parseFloat(parseXmlTag(xml, 'TotalMaterial'));
            if (!isNaN(totalMatCC)) {
                document.getElementById('in-peso').value = String(Math.round(totalMatCC * 1.06));
                sync('peso', true);
            }

            const totalSec = parseFloat(parseXmlTag(xml, 'TotalPrintTime'));
            if (!isNaN(totalSec) && totalSec > 0) {
                const totalMin = Math.round(totalSec / 60);
                const hrs = Math.floor(totalMin / 60);
                const mins = String(totalMin % 60).padStart(2, '0');
                document.getElementById('in-tiempo').value = `${hrs}:${mins}hrs`;
                sync('tiempo', true);
            }

            const matCode = (parseXmlTag(xml, 'MaterialType') || parseXmlTag(xml, 'materialType') || '').toUpperCase();
            const matMap = {
                DIM90: 'Dimengel 90',
                DIM100: 'Dimengel 100',
                DIM110: 'Dimengel 110',
                DIM20FR: 'Dimengel 20-FR'
            };
            if (matMap[matCode]) {
                document.getElementById('in-material').value = matMap[matCode];
                sync('material', true);
            }

            const pMode = (parseXmlTag(xml, 'PrintMode') || parseXmlTag(xml, 'printMode') || '').toLowerCase();
            const modeMap = {
                highresolution: 'HighRes',
                highres: 'HighRes',
                quality: 'Quality',
                normal: 'Normal',
                fast: 'Fast'
            };
            if (modeMap[pMode]) {
                document.getElementById('in-height').value = modeMap[pMode];
            }

            const wType = (parseXmlTag(xml, 'WidthType') || parseXmlTag(xml, 'widthType') || '').toLowerCase();
            if (['single', 'double', 'mega'].includes(wType)) {
                document.getElementById('in-width').value = wType;
            }

            updateBoquilla(true);
            saveState();
            showToast(`Parámetros Massivit importados (${baseName}).`);
        };
        reader.readAsText(mainXmlFile);
    }

    // Mapear automáticamente las 4 vistas PNG de Massivit (_Y -> Frente, _X -> Lateral, _Z -> Superior, base.png -> Perspectiva)
    const pngFiles = files.filter(f => f.name.toLowerCase().endsWith('.png'));
    const loadPngIntoSlot = (fileObj, slotId) => {
        if (!fileObj) return;
        const r = new FileReader();
        r.onload = (ev) => setSlotImage(slotId, ev.target.result);
        r.readAsDataURL(fileObj);
    };

    const frentePng = pngFiles.find(f => /_y\.png$/i.test(f.name));
    const lateralPng = pngFiles.find(f => /_x\.png$/i.test(f.name));
    const superiorPng = pngFiles.find(f => /_z\.png$/i.test(f.name)) || pngFiles.find(f => /_job\.png$/i.test(f.name));
    const perspPng = pngFiles.find(f => !/_(x|xminus|y|yminus|z|zminus|job|toolpath)\.png$/i.test(f.name));

    loadPngIntoSlot(frentePng, 'img-frente');
    loadPngIntoSlot(lateralPng, 'img-lateral');
    loadPngIntoSlot(superiorPng, 'img-superior');
    loadPngIntoSlot(perspPng, 'img-perspectiva');
}

function readOdpJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            applyStateObject(parsed);
            showToast(`ODP 3D cargada: ${file.name}`);
        } catch (err) {
            alert('El archivo seleccionado no tiene un formato .odp3d / JSON válido.');
        }
    };
    reader.readAsText(file);
}

/* ==================== ZOOM DE HOJA ==================== */
function setZoom(scale) {
    currentZoom = Math.min(1.5, Math.max(0.45, Math.round(scale * 100) / 100));
    const wrapper = document.getElementById('page-scale-wrapper');
    const label = document.getElementById('zoom-label');
    if (wrapper) {
        wrapper.style.transform = `scale(${currentZoom})`;
        wrapper.style.marginBottom = `${(currentZoom - 1) * 1056}px`;
    }
    if (label) label.innerText = `${Math.round(currentZoom * 100)}%`;
}

function changeZoom(delta) {
    setZoom(currentZoom + delta);
}

function fitZoom() {
    const workspace = document.querySelector('.workspace');
    if (!workspace) return;
    const availH = workspace.clientHeight - 75;
    const pageH = 11 * 96; // 1056px
    setZoom(availH / pageH);
}

/* ==================== TOAST UI ==================== */
function showToast(message, actionText = null, actionCallback = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const span = document.createElement('span');
    span.innerText = message;
    toast.appendChild(span);

    if (actionText && typeof actionCallback === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = actionText;
        btn.onclick = () => {
            actionCallback();
            toast.remove();
        };
        toast.appendChild(btn);
    }

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 4500);
}

/* ==================== EVENTOS GLOBALES (DRAG & DROP, PASTE, ATAJOS) ==================== */
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setTodayIfEmpty();
    setActiveSlot('img-frente');

    // Drag & Drop en las 4 cajas de vistas (archivos externos o intercambio entre cajas)
    const imgBoxes = document.querySelectorAll('.img-box');
    imgBoxes.forEach(box => {
        const slotId = box.dataset.slot;
        box.setAttribute('draggable', 'true');

        box.addEventListener('dragstart', (e) => {
            const img = document.getElementById(slotId);
            if (!img || !img.getAttribute('src')) {
                e.preventDefault();
                return;
            }
            draggedSourceSlot = slotId;
            e.dataTransfer.effectAllowed = 'move';
        });

        box.addEventListener('dragend', () => {
            draggedSourceSlot = null;
        });

        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = '#3b82f6';
        });

        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = '';
        });

        box.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            box.style.borderColor = '';

            // Caso 1: Intercambio entre dos vistas
            if (draggedSourceSlot && draggedSourceSlot !== slotId) {
                const srcImg = document.getElementById(draggedSourceSlot);
                const dstImg = document.getElementById(slotId);
                const tmp = srcImg.getAttribute('src') || '';
                srcImg.setAttribute('src', dstImg.getAttribute('src') || '');
                dstImg.setAttribute('src', tmp);
                refreshImageBoxStates();
                saveState();
                setActiveSlot(slotId);
                showToast(`Vistas intercambiadas: ${SLOT_LABELS[draggedSourceSlot]} ↔ ${SLOT_LABELS[slotId]}`);
                draggedSourceSlot = null;
                return;
            }

            // Caso 2: Archivo arrastrado desde el explorador
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            if (file.name.endsWith('.odp3d') || file.name.endsWith('.odp') || file.name.endsWith('.json')) {
                readOdpJsonFile(file);
                return;
            }
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    setSlotImage(slotId, evt.target.result);
                    setActiveSlot(slotId);
                    advanceToNextEmptySlot(slotId);
                    showToast(`Imagen colocada en ${SLOT_LABELS[slotId]}.`);
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Soltar un archivo .odp3d / .json en cualquier parte de la ventana
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith('.odp3d') || file.name.endsWith('.odp') || file.name.endsWith('.json'))) {
            e.preventDefault();
            readOdpJsonFile(file);
        }
    });

    // Pegar imagen desde el portapapeles (Ctrl+V) directo a la vista activa
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const target = activeSlotId || 'img-frente';
                    setSlotImage(target, evt.target.result);
                    showToast(`Captura pegada en "${SLOT_LABELS[target]}".`);
                    advanceToNextEmptySlot(target);
                };
                reader.readAsDataURL(file);
                return;
            }
        }
    });

    // Atajos de teclado (Ctrl+S, Ctrl+O, Ctrl+P)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            exportOdpFile();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            triggerOpenFile();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            handlePrint();
        }
    });
});

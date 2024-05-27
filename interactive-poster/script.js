const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;

canvas.addEventListener('mousedown', () => {
    drawing = true;
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
    context.beginPath();
});

canvas.addEventListener('mousemove', draw);

function draw(event) {
    if (!drawing) return;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = '#000';

    context.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
}

document.getElementById('save-button').addEventListener('click', saveDrawing);

function saveDrawing() {
    const dataURL = canvas.toDataURL();
    db.collection('drawings').add({
        data: dataURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Drawing saved');
    }).catch((error) => {
        console.error('Error saving drawing: ', error);
    });
}

async function loadDrawings() {
    const snapshot = await db.collection('drawings').get();
    snapshot.forEach(doc => {
        const img = new Image();
        img.src = doc.data().data;
        document.body.appendChild(img);
    });
}

window.onload = loadDrawings;

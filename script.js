const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let currentPath = [];
let history = [];
let isTextMode = false;
let currentColor = '#000000';
let currentBrushSize = 5;
let textInputPosition = { x: 0, y: 0 };

function resizeCanvas() {
    const backgroundImage = document.getElementById('background-image');
    if (!backgroundImage) {
        console.error('Background image element not found');
        return;
    }
    canvas.width = backgroundImage.clientWidth;
    canvas.height = backgroundImage.clientHeight;
    context.fillStyle = "rgba(255, 255, 255, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);

document.getElementById('toggle-mode').addEventListener('click', () => {
    isTextMode = !isTextMode;
    document.getElementById('text-input-dialog').style.display = isTextMode ? 'block' : 'none';
    canvas.style.cursor = isTextMode ? 'text' : 'crosshair';
});

canvas.addEventListener('click', (event) => {
    if (!isTextMode) return;
    const rect = canvas.getBoundingClientRect();
    textInputPosition.x = event.clientX - rect.left;
    textInputPosition.y = event.clientY - rect.top;
    document.getElementById('text-input-dialog').style.display = 'block';
});

document.getElementById('text-confirm-button').addEventListener('click', () => {
    const text = document.getElementById('text-input').value;
    if (!text) return;
    context.fillStyle = currentColor;
    context.font = '12px Arial';
    context.fillText(text, textInputPosition.x, textInputPosition.y);
    history.push([{ x: textInputPosition.x, y: textInputPosition.y, text, color: currentColor, type: 'text' }]);
    document.getElementById('text-input').value = '';
    document.getElementById('text-input-dialog').style.display = 'none';
});

async function getPosters() {
    const querySnapshot = await db.collection('posters').get();
    querySnapshot.forEach((doc) => {
        const poster = doc.data();
        console.log('Poster:', poster); // 添加日志输出

        const img = document.createElement('img');
        img.src = poster.backgroundImageUrl;
        img.alt = poster.id;
        console.log('Image URL:', poster.backgroundImageUrl); // 添加日志输出

        if (poster.status === 'current') {
            const currentPosterDiv = document.getElementById('current-poster');
            const backgroundImage = document.getElementById('background-image');
            backgroundImage.src = poster.backgroundImageUrl;
            currentPosterDiv.appendChild(img);
            img.addEventListener('click', enterDrawingMode);
        } else if (poster.status === 'ended') {
            const endedPostersDiv = document.getElementById('ended-posters');
            endedPostersDiv.appendChild(img);
        } else if (poster.status === 'upcoming') {
            const upcomingPostersDiv = document.getElementById('upcoming-posters');
            upcomingPostersDiv.appendChild(img);
        }
    });
}

async function loadDrawings() {
    const querySnapshot = await db.collection('drawings').orderBy('createdAt', 'asc').get();
    querySnapshot.forEach((doc) => {
        const drawingHistory = doc.data().history;
        console.log('Loaded drawing:', drawingHistory);

        const paths = drawingHistory.reduce((acc, point) => {
            if (!acc[point.pathIndex]) {
                acc[point.pathIndex] = [];
            }
            acc[point.pathIndex].push(point);
            return acc;
        }, {});

        Object.values(paths).forEach(path => {
            context.beginPath();
            path.forEach((point, index) => {
                if (point.type === 'text') {
                    context.fillStyle = point.color;
                    context.font = '12px Arial';
                    context.fillText(point.text, point.x, point.y);
                } else {
                    context.strokeStyle = point.color;
                    context.lineWidth = point.size;
                    if (index === 0) {
                        context.moveTo(point.x, point.y);
                    } else {
                        context.lineTo(point.x, point.y);
                    }
                }
            });
            context.stroke();
        });
    });
}

function enterDrawingMode() {
    const drawingControls = document.getElementById('drawing-controls');
    drawingControls.style.display = 'block';
    loadDrawings();
}

window.onload = getPosters;

const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let currentPath = [];
let history = [];

// 调整canvas的尺寸以匹配背景图像
function resizeCanvas() {
    const backgroundImage = document.getElementById('background-image');
    canvas.width = backgroundImage.clientWidth;
    canvas.height = backgroundImage.clientHeight;
    context.fillStyle = "rgba(255, 255, 255, 0.1)"; // 10% 透明度的白色覆盖层
    context.fillRect(0, 0, canvas.width, canvas.height);
}

// 监听窗口调整大小事件，调整canvas尺寸
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    currentPath = [];
    history.push(currentPath);
    draw(event);
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

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);

    currentPath.push({ x, y });
}

document.getElementById('save-button').addEventListener('click', saveDrawing);

async function saveDrawing() {
    const flatHistory = history.reduce((acc, path, index) => {
        const flatPath = path.map(point => ({
            x: point.x,
            y: point.y,
            pathIndex: index
        }));
        return acc.concat(flatPath);
    }, []);

    try {
        await db.collection('drawings').add({
            history: flatHistory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Drawing saved');
        console.log('Drawing saved:', flatHistory);
    } catch (error) {
        console.error('Error saving drawing:', error);
    }
}

async function loadDrawings() {
    const q = db.collection('drawings').orderBy('createdAt', 'asc');
    const querySnapshot = await q.get();
    querySnapshot.forEach((doc) => {
        const drawingHistory = doc.data().history;
        console.log('Loaded drawing:', drawingHistory);

        const paths = drawingHistory.reduce((acc, point) => {
            if (!acc[point.pathIndex]) {
                acc[point.pathIndex] = [];
            }
            acc[point.pathIndex].push({ x: point.x, y: point.y });
            return acc;
        }, {});

        Object.values(paths).forEach(path => {
            context.beginPath();
            path.forEach((point, index) => {
                if (index === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });
            context.stroke();
        });
    });
}

window.onload = loadDrawings;

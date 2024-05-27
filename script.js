const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let currentPath = [];
let history = [];

// 开始绘制
canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    currentPath = [];
    history.push(currentPath);
    draw(event);
});

// 停止绘制
canvas.addEventListener('mouseup', () => {
    drawing = false;
    context.beginPath();
});

// 移动鼠标时绘制
canvas.addEventListener('mousemove', draw);

function draw(event) {
    if (!drawing) return;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = '#000';

    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;

    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);

    // 保存路径点到当前路径中
    currentPath.push({ x, y });
}

// 保存绘制内容到数据库
document.getElementById('save-button').addEventListener('click', saveDrawing);

async function saveDrawing() {
    try {
        await db.collection('drawings').add({
            history: history,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Drawing saved');
        console.log('Drawing saved:', history);
    } catch (error) {
        console.error('Error saving drawing:', error);
    }
}

// 加载数据库中的绘制内容
async function loadDrawings() {
    const q = db.collection('drawings').orderBy('createdAt', 'asc');
    const querySnapshot = await q.get();
    querySnapshot.forEach((doc) => {
        const drawingHistory = doc.data().history;
        console.log('Loaded drawing:', drawingHistory);
        drawingHistory.forEach(path => {
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

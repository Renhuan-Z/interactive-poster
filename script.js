const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let history = [];

// 开始绘制
canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    history.push([]);
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

    context.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);

    // 保存路径点到历史记录中
    history[history.length - 1].push({
        x: event.clientX - canvas.offsetLeft,
        y: event.clientY - canvas.offsetTop
    });
}

// 保存绘制内容到数据库
document.getElementById('save-button').addEventListener('click', saveDrawing);

function saveDrawing() {
    db.collection('drawings').add({
        history: history,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Drawing saved');
    }).catch((error) => {
        console.error('Error saving drawing: ', error);
    });
}

// 加载数据库中的绘制内容
async function loadDrawings() {
    const snapshot = await db.collection('drawings').orderBy('createdAt', 'asc').get();
    snapshot.forEach(doc => {
        const drawingHistory = doc.data().history;
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


const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;

// 初始化画布历史记录
let history = [];

// 绘制函数
function draw(event) {
    if (!drawing) return;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = '#000';

    context.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);

    // 将绘制的路径保存到历史记录中
    history.push({
        x: event.clientX - canvas.offsetLeft,
        y: event.clientY - canvas.offsetTop
    });
}

// 开始绘制
canvas.addEventListener('mousedown', () => {
    drawing = true;
});

// 停止绘制
canvas.addEventListener('mouseup', () => {
    drawing = false;
    context.beginPath();
});

// 移动鼠标时绘制
canvas.addEventListener('mousemove', draw);

// 保存绘制内容到数据库
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

// 加载数据库中的绘制内容
async function loadDrawings() {
    const snapshot = await db.collection('drawings').orderBy('createdAt', 'asc').get();
    snapshot.forEach(doc => {
        const img = new Image();
        img.src = doc.data().data;
        img.onload = () => {
            context.drawImage(img, 0, 0);
        };
    });
}

window.onload = loadDrawings;


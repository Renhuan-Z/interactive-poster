// 初始化海报数据
const postersData = [
    {
        id: 'poster-ended',
        url: 'your-ended-poster-url.jpg',
        date: '22/05',
        status: 'ended'
    },
    {
        id: 'poster-ended2',
        url: 'your-ended-poster-url2.jpg',
        date: '29/05',
        status: 'ended'
    },
    {
        id: 'poster-current',
        url: 'background.jpg',
        date: 'NOW',
        status: 'current'
    },
    {
        id: 'poster-upcoming',
        url: 'background2.jpg',
        date: '07/06',
        status: 'upcoming'
    },
    {
        id: 'poster-upcoming2',
        url: 'your-upcoming-poster-url2.jpg',
        date: '15/06',
        status: 'upcoming'
    }
];

// 设置海报图片和日期
postersData.forEach(poster => {
    const posterElement = document.getElementById(poster.id);
    const imgElement = posterElement.querySelector('img');
    imgElement.src = poster.url;
    posterElement.querySelector('p').innerText = poster.date;
    imgElement.onerror = function() {
        posterElement.style.display = 'none';
    };
});

// 切换海报
document.getElementById('prevBtn').addEventListener('click', function() {
    shiftPosters(-1);
});

document.getElementById('nextBtn').addEventListener('click', function() {
    shiftPosters(1);
});

function shiftPosters(direction) {
    const posters = document.querySelectorAll('.poster');
    posters.forEach(poster => {
        const currentOrder = parseInt(window.getComputedStyle(poster).order);
        let newOrder = currentOrder + direction;
        if (newOrder > posters.length - 1) newOrder = 0;
        if (newOrder < 0) newOrder = posters.length - 1;
        poster.style.order = newOrder;
    });
}

// 绘制模式相关的代码
const currentPoster = document.getElementById('poster-current');
const drawingMode = document.getElementById('drawing-mode');
const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let currentPath = [];
let history = [];
let currentColor = '#000000';
let currentBrushSize = 5;

currentPoster.addEventListener('click', function() {
    document.querySelector('.container').classList.add('hidden');
    drawingMode.classList.remove('hidden');
    resizeCanvas();
    loadDrawings();
});

document.getElementById('exitDrawingMode').addEventListener('click', function() {
    drawingMode.classList.add('hidden');
    document.querySelector('.container').classList.remove('hidden');
});

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
    context.lineWidth = currentBrushSize;
    context.lineCap = 'round';
    context.strokeStyle = currentColor;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);

    currentPath.push({ x, y, color: currentColor, size: currentBrushSize });
}

document.getElementById('color-picker').addEventListener('input', (event) => {
    currentColor = event.target.value;
});

document.getElementById('brush-size').addEventListener('input', (event) => {
    currentBrushSize = event.target.value;
});

document.getElementById('save-button').addEventListener('click', saveDrawing);

function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

async function saveDrawing() {
    const flatHistory = history.reduce((acc, path, index) => {
        const flatPath = path.map(point => ({
            ...point,
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
            acc[point.pathIndex].push(point);
            return acc;
        }, {});

        Object.values(paths).forEach(path => {
            context.beginPath();
            path.forEach((point, index) => {
                context.strokeStyle = point.color;
                context.lineWidth = point.size;
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

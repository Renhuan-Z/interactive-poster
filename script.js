const canvas = document.getElementById('drawing-canvas');
const context = canvas.getContext('2d');
let drawing = false;
let currentPath = [];
let history = [];
let isTextMode = false;
let currentColor = '#000000';
let currentBrushSize = 5;
let textInputPosition = { x: 0, y: 0 };

// 获取当前时间
const now = new Date();

// 获取海报数据
async function getPosters() {
  const posters = [];
  const snapshot = await db.collection('posters').get();
  snapshot.forEach(doc => {
    posters.push({ id: doc.id, ...doc.data() });
  });
  return posters;
}

// 更新海报状态
function updatePosterStatus(posters) {
  posters.forEach(poster => {
    const startTime = new Date(poster.startTime);
    const endTime = new Date(poster.endTime);
    if (now >= startTime && now <= endTime) {
      poster.status = 'current';
    } else if (now < startTime) {
      poster.status = 'upcoming';
    } else {
      poster.status = 'ended';
    }
  });
  return posters;
}

// 显示海报
function displayPosters(posters) {
  const currentPoster = posters.find(poster => poster.status === 'current');
  const endedPosters = posters.filter(poster => poster.status === 'ended');
  const upcomingPosters = posters.filter(poster => poster.status === 'upcoming');

  // 显示当前海报
  if (currentPoster) {
    document.getElementById('background-image').src = currentPoster.backgroundImageUrl;
  }

  // 显示已结束和未开始的海报
  if (endedPosters.length > 0) {
    document.getElementById('ended-poster').src = endedPosters[0].backgroundImageUrl;
  }
  if (upcomingPosters.length > 0) {
    document.getElementById('upcoming-poster').src = upcomingPosters[0].backgroundImageUrl;
  }
}

// 初始化函数
async function init() {
  const posters = await getPosters();
  const updatedPosters = updatePosterStatus(posters);
  displayPosters(updatedPosters);
}

init();

// 调整canvas的尺寸以匹配背景图像
function resizeCanvas() {
  const backgroundImage = document.getElementById('background-image');
  canvas.width = backgroundImage.clientWidth;
  canvas.height = backgroundImage.clientHeight;
  context.fillStyle = "rgba(255, 255, 255, 0.1)"; // 10% 透明度的白色覆盖层
  context.fillRect(0, 0, canvas.width, canvas.height);
}

// 清空画布和数据库函数
async function clearCanvasAndDatabase() {
  // 清空画布
  context.clearRect(0, 0, canvas.width, canvas.height);
  history = [];
  resizeCanvas(); // 重新填充背景

  // 删除数据库中的数据
  const q = db.collection('drawings');
  const querySnapshot = await q.get();
  querySnapshot.forEach((doc) => {
    doc.ref.delete();
  });

  console.log('Canvas and database cleared');
}

// 确保 clearCanvasAndDatabase 函数在全局作用域中
window.clearCanvasAndDatabase = clearCanvasAndDatabase;

// 监听窗口调整大小事件，调整canvas尺寸
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousedown', (event) => {
  if (isTextMode) return;
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
  if (!drawing || isTextMode) return;
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

document.getElementById('save-button').addEventListener('click', saveDrawing);
document.getElementById('color-picker').addEventListener('input', (event) => {
  currentColor = event.target.value;
});
document.getElementById('brush-size').addEventListener('input', (event) => {
  currentBrushSize = event.target.value;
});
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
  context.font = '12px Arial'; // 缩小字体到12px
  context.fillText(text, textInputPosition.x, textInputPosition.y);

  history.push([{ x: textInputPosition.x, y: textInputPosition.y, text, color: currentColor, type: 'text' }]);
  document.getElementById('text-input').value = '';
  document.getElementById('text-input-dialog').style.display = 'none';
});

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
        if (point.type === 'text') {
          context.fillStyle = point.color;
          context.font = '12px Arial'; // 确保加载时字体也为12px
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

window.onload = loadDrawings;


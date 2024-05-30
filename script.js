document.addEventListener("DOMContentLoaded", function () {
    // 初始化轮播
    let currentIndex = 2; // 当前展示中间的海报索引
    const posters = document.querySelectorAll('.poster');

    // 从 Firebase Firestore 获取海报数据
    async function getPosters() {
        try {
            const snapshot = await db.collection('posters').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                const posterElement = document.getElementById(`${data.status}-poster-${data.id}`);
                if (posterElement) {
                    posterElement.style.backgroundImage = `url(${data.backgroundImageUrl})`;
                }
            });
        } catch (error) {
            console.error("Error getting posters: ", error);
        }
    }

    getPosters();

    // 轮播功能
    document.getElementById('prev-button').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + posters.length) % posters.length;
        updateCarousel();
    });

    document.getElementById('next-button').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % posters.length;
        updateCarousel();
    });

    function updateCarousel() {
        posters.forEach((poster, index) => {
            poster.classList.remove('current', 'ended', 'upcoming');
            if (index === currentIndex) {
                poster.classList.add('current');
            } else if (index === (currentIndex - 1 + posters.length) % posters.length || index === (currentIndex + 1) % posters.length) {
                poster.classList.add('ended');
            } else {
                poster.classList.add('upcoming');
            }
        });
    }

    posters.forEach(poster => {
        poster.addEventListener('click', () => {
            if (poster.classList.contains('current')) {
                enterDrawingMode();
            }
        });
    });

    // 进入绘制模式
    function enterDrawingMode() {
        document.getElementById('carousel-container').style.display = 'none';
        document.getElementById('editor').style.display = 'flex';
        const canvas = document.getElementById('drawing-canvas');
        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let drawing = false;
        let currentPath = [];
        let history = [];
        let currentColor = '#000000';
        let currentBrushSize = 5;
        let isTextMode = false;
        let textInputPosition = { x: 0, y: 0 };

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            context.fillStyle = "rgba(255, 255, 255, 0.1)";
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        function draw(event) {
            if (!drawing || isTextMode) return;
            context.lineWidth = currentBrushSize;
            context.lineCap = 'round';
            context.strokeStyle = currentColor;
            const x = event.clientX;
            const y = event.clientY;
            context.lineTo(x, y);
            context.stroke();
            context.beginPath();
            context.moveTo(x, y);
            currentPath.push({ x, y, color: currentColor, size: currentBrushSize });
        }

        canvas.addEventListener('mousedown', () => { drawing = true; currentPath = []; history.push(currentPath); });
        canvas.addEventListener('mouseup', () => { drawing = false; context.beginPath(); });
        canvas.addEventListener('mousemove', draw);

        document.getElementById('color-picker').addEventListener('input', event => { currentColor = event.target.value; });
        document.getElementById('brush-size').addEventListener('input', event => { currentBrushSize = event.target.value; });
        document.getElementById('text-button').addEventListener('click', () => { isTextMode = !isTextMode; });

        document.getElementById('exit-button').addEventListener('click', () => {
            document.getElementById('carousel-container').style.display = 'flex';
            document.getElementById('editor').style.display = 'none';
        });

        document.getElementById('save-button').addEventListener('click', async () => {
            try {
                await db.collection('drawings').add({ history, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                alert('Drawing saved');
            } catch (error) {
                console.error('Error saving drawing:', error);
            }
        });

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
});

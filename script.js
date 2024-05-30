document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 2; // 当前展示中间的海报索引
    const posters = document.querySelectorAll('.poster');
    let currentPosterId;
    let drawing = false;
    let currentPath = [];
    let history = [];
    let currentColor = '#000000';
    let currentBrushSize = 5;
    let isTextMode = false;
    let textInputPosition = { x: 0, y: 0 };
    const canvas = document.getElementById('drawing-canvas');
    const context = canvas.getContext('2d');
    let postersDataCache = null; // 缓存海报数据

    // 从 Firebase Firestore 获取海报数据
    async function getPosters() {
        if (postersDataCache) {
            return postersDataCache;
        }
        try {
            const snapshot = await db.collection('posters').get();
            postersDataCache = snapshot;
            return snapshot;
        } catch (error) {
            console.error("Error getting posters: ", error);
        }
    }

    async function loadPosters() {
        try {
            const snapshot = await getPosters();
            if (!snapshot) {
                throw new Error("No posters data found.");
            }
            snapshot.forEach(doc => {
                const data = doc.data();
                let posterElement;
                if (doc.id === 'poster01') {
                    posterElement = document.getElementById('poster-3');
                } else if (doc.id === 'poster02') {
                    posterElement = document.getElementById('poster-4');
                }
                if (posterElement) {
                    posterElement.style.backgroundImage = `url(${data.backgroundImageUrl})`;
                    posterElement.dataset.posterId = doc.id;
                }
            });
            updateCarousel(); // 初始化海报状态
        } catch (error) {
            console.error("Error loading posters: ", error);
        }
    }

    loadPosters();

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
            poster.classList.remove('current', 'left-one', 'right-one', 'left-two', 'right-two');
            poster.style.filter = 'blur(10px)'; // 默认模糊

            if (index === currentIndex) {
                poster.classList.add('current');
                poster.style.filter = 'none'; // 当前海报清晰
            } else if (index === (currentIndex - 1 + posters.length) % posters.length) {
                poster.classList.add('left-one');
            } else if (index === (currentIndex + 1) % posters.length) {
                poster.classList.add('right-one');
            } else if (index === (currentIndex - 2 + posters.length) % posters.length) {
                poster.classList.add('left-two');
            } else if (index === (currentIndex + 2) % posters.length) {
                poster.classList.add('right-two');
            }
        });
    }

    posters.forEach(poster => {
        poster.addEventListener('click', () => {
            if (poster.classList.contains('current')) {
                currentPosterId = poster.dataset.posterId;
                enterDrawingMode();
            }
        });
    });

    // 进入绘制模式
    async function enterDrawingMode() {
        document.getElementById('carousel-container').style.display = 'none';
        document.getElementById('editor').style.display = 'flex';

        const currentPosterElement = posters[currentIndex];
        const posterBackgroundImage = currentPosterElement.style.backgroundImage.slice(5, -2);

        const img = new Image();
        img.src = posterBackgroundImage;

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            loadDrawings(); // 确保在图像加载后调用
        };

        async function loadDrawings() {
            try {
                const snapshot = await db.collection('posters').doc(currentPosterId).collection('drawings').get();
                const paths = {};

                snapshot.forEach(doc => {
                    const point = doc.data();
                    if (!paths[point.pathIndex]) {
                        paths[point.pathIndex] = [];
                    }
                    paths[point.pathIndex].push(point);
                });

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0, canvas.width, canvas.height); // 绘制背景图片

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
            } catch (error) {
                console.error('Error loading drawings:', error);
            }
        }

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
                const batch = db.batch();
                const drawingsRef = db.collection('posters').doc(currentPosterId).collection('drawings');

                history.forEach((path, pathIndex) => {
                    path.forEach(point => {
                        const pointRef = drawingsRef.doc();
                        batch.set(pointRef, { ...point, pathIndex });
                    });
                });

                await batch.commit();
                alert('Drawing saved');
            } catch (error) {
                console.error('Error saving drawing:', error);
            }
        });

        function resizeCanvas() {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height); // 绘制背景图片
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // 初始调整画布大小
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 2; // 当前展示中间的海报索引
    const carousel = document.getElementById('carousel');
    const posters = [];
    let currentPosterId;

    console.log("DOM content loaded and script running");

    // 获取前后按钮元素
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    console.log("Previous button element:", prevButton);
    console.log("Next button element:", nextButton);

    // 从 Firebase Firestore 获取海报数据
    async function getPosters() {
        console.log("Fetching posters from Firestore...");
        try {
            const snapshot = await db.collection('posters').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log("Poster data:", data);
                const posterElement = document.createElement('div');
                posterElement.className = 'poster';
                posterElement.style.backgroundImage = `url(${data.backgroundImageUrl})`;
                posterElement.dataset.posterId = doc.id;
                posters.push(posterElement);
                carousel.appendChild(posterElement);
            });
            updateCarousel(); // 初始化海报状态
        } catch (error) {
            console.error("Error getting posters: ", error);
        }
    }

    getPosters();

    // 轮播功能
    prevButton.addEventListener('click', () => {
        console.log("Previous button clicked");
        currentIndex = (currentIndex - 1 + posters.length) % posters.length;
        updateCarousel();
    });

    nextButton.addEventListener('click', () => {
        console.log("Next button clicked");
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
        console.log("Carousel updated. Current index:", currentIndex);
    }

    carousel.addEventListener('click', (event) => {
        const clickedPoster = event.target.closest('.poster');
        if (clickedPoster && clickedPoster.classList.contains('current')) {
            currentPosterId = clickedPoster.dataset.posterId;
            console.log("Poster clicked:", currentPosterId);
            enterDrawingMode();
        }
    });

    async function enterDrawingMode() {
        console.log("Entering drawing mode for poster:", currentPosterId);
        document.getElementById('carousel-container').style.display = 'none';
        document.getElementById('editor').style.display = 'flex';
        const canvas = document.getElementById('drawing-canvas');
        const context = canvas.getContext('2d');

        const currentPosterElement = posters[currentIndex];
        const posterBackgroundImage = currentPosterElement.style.backgroundImage.slice(5, -2);

        const img = new Image();
        img.src = posterBackgroundImage;

        img.onload = () => {
            // 设置画布宽度和高度，并保持比例
            const width = window.innerWidth;
            const height = (img.height / img.width) * width;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            loadDrawings(); // 确保在图像加载后调用
        };

        let drawing = false;
        let currentPath = [];
        let history = [];
        let currentColor = '#000000';
        let currentBrushSize = 5;
        let isTextMode = false;
        let textInputPosition = { x: 0, y: 0 };

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
                            context.font = '16px Arial';
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

        // 双指拖动功能
        let isDragging = false;
        let startX, startY;
        let initialPinchDistance = null;
        let initialScrollY = window.scrollY;

        function handleTouchStart(event) {
            if (event.touches.length === 2) {
                isDragging = true;
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                initialPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                initialScrollY = window.scrollY;
            }
        }

        function handleTouchMove(event) {
            if (isDragging && event.touches.length === 2) {
                const currentPinchDistance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY
                );
                const dy = event.touches[0].clientY - startY;
                window.scrollTo(0, initialScrollY - dy);
            }
        }

        function handleTouchEnd(event) {
            if (event.touches.length < 2) {
                isDragging = false;
                initialPinchDistance = null;
            }
        }

        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        // 文本输入框功能
        const textInput = document.getElementById('text-input');

        document.getElementById('text-button').addEventListener('click', () => {
            if (!isTextMode) {
                textInput.style.display = 'block';
                textInput.style.left = '50%';
                textInput.style.top = '50%';
                textInput.focus();
            } else {
                textInput.style.display = 'none';
            }
            isTextMode = !isTextMode;
            console.log("Text mode toggled. Current mode:", isTextMode);
        });

        textInput.addEventListener('blur', () => {
            if (textInput.value.trim() !== '') {
                const rect = canvas.getBoundingClientRect();
                const x = parseInt(textInput.style.left) - rect.left;
                const y = parseInt(textInput.style.top) - rect.top;
                context.fillStyle = currentColor;
                context.font = '16px Arial';
                context.fillText(textInput.value, x, y);
                history.push([{ type: 'text', text: textInput.value, x, y, color: currentColor }]);
                textInput.value = '';
            }
            textInput.style.display = 'none';
            isTextMode = false;
            console.log("Text input submitted and hidden.");
        });

        textInput.addEventListener('mousedown', (event) => {
            event.stopPropagation(); // 防止触发画布上的 mousedown 事件
        });

        // 允许拖动输入框
        let isDraggingTextInput = false;
        let textInputStartX, textInputStartY;

        textInput.addEventListener('mousedown', (event) => {
            isDraggingTextInput = true;
            textInputStartX = event.clientX - textInput.offsetLeft;
            textInputStartY = event.clientY - textInput.offsetTop;
        });

        document.addEventListener('mousemove', (event) => {
            if (isDraggingTextInput) {
                textInput.style.left = `${event.clientX - textInputStartX}px`;
                textInput.style.top = `${event.clientY - textInputStartY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDraggingTextInput = false;
        });

        // 保存绘画数据
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

        // 退出绘画模式
        document.getElementById('exit-button').addEventListener('click', () => {
            document.getElementById('carousel-container').style.display = 'flex';
            document.getElementById('editor').style.display = 'none';
        });
    }
});

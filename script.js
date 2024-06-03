document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 2; // 当前展示中间的海报索引
    const posters = document.querySelectorAll('.poster');
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
                let posterElement;
                if (doc.id === 'poster01') {
                    posterElement = document.getElementById('poster-1');
                } else if (doc.id === 'poster02') {
                    posterElement = document.getElementById('poster-2');
                } else if (doc.id === 'poster03') {
                    posterElement = document.getElementById('poster-3');
                } else if (doc.id === 'poster04') {
                    posterElement = document.getElementById('poster-4');
                } else if (doc.id === 'poster05') {
                    posterElement = document.getElementById('poster-5');
                }
                if (posterElement) {
                    posterElement.style.backgroundImage = `url(${data.backgroundImageUrl})`;
                    posterElement.dataset.posterId = doc.id;
                    console.log(`Set background for ${doc.id} to ${data.backgroundImageUrl}`);
                }
            });
            updateCarousel(); // 初始化海报状态
        } catch (error) {
            console.error("Error getting posters: ", error);
        }
    }

    getPosters();

    // 轮播功能
    prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + posters.length) % posters.length;
        updateCarousel();
    });

    nextButton.addEventListener('click', () => {
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

    posters.forEach(poster => {
        poster.addEventListener('click', () => {
            if (poster.classList.contains('current')) {
                currentPosterId = poster.dataset.posterId;
                console.log("Poster clicked:", currentPosterId);
                enterDrawingMode();
            }
        });
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
            resizeCanvas(img);
            loadDrawings(img); // 确保在图像加载后调用
        };

        let drawing = false;
        let currentPath = [];
        let history = [];
        let currentColor = '#000000';
        let currentBrushSize = 5;
        let isTextMode = false;
        let textInputPosition = { x: 0, y: 0 };

        async function loadDrawings(img) {
            try {
                const snapshot = await db.collection('posters').doc(currentPosterId).collection('drawings').get();
                const paths = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    paths.push(data); // Ensure we push the entire data object
                });

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0, canvas.width, canvas.height); // 绘制背景图片

                paths.forEach(path => {
                    context.beginPath();
                    if (path.points && Array.isArray(path.points)) { // Ensure path.points is defined and is an array
                        path.points.forEach((point, index) => {
                            if (point.type === 'text') {
                                context.fillStyle = point.color;
                                context.font = '16px Arial';
                                context.fillText(point.text, point.x * canvas.width, point.y * canvas.height);

                                // 添加悬停事件监听器
                                const textElement = createTextElement(point);
                                canvas.parentElement.appendChild(textElement);
                                textElement.style.left = `${point.x * canvas.width}px`;
                                textElement.style.top = `${point.y * canvas.height}px`;
                                textElement.addEventListener('mouseover', () => showTooltip(textElement, point));
                                textElement.addEventListener('mouseout', hideTooltip);
                            } else {
                                context.strokeStyle = point.color;
                                context.lineWidth = point.size;
                                if (index === 0) {
                                    context.moveTo(point.x * canvas.width, point.y * canvas.height);
                                } else {
                                    context.lineTo(point.x * canvas.width, point.y * canvas.height);
                                }
                            }
                        });
                    }
                    context.stroke();
                });
            } catch (error) {
                console.error('Error loading drawings:', error);
            }
        }

        function createTextElement(point) {
            const textElement = document.createElement('div');
            textElement.classList.add('text-element');
            textElement.textContent = point.text;
            return textElement;
        }

        function showTooltip(element, point) {
            const tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.innerHTML = `
                <div>酒量: ${point.alcoholInput}</div>
                <div>保存时间: ${new Date(point.timestamp).toLocaleString()}</div>
            `;
            document.body.appendChild(tooltip);
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight}px`;
        }

        function hideTooltip() {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        }

        function draw(event) {
            if (!drawing || isTextMode) return;
            context.lineWidth = currentBrushSize;
            context.lineCap = 'round';
            context.strokeStyle = currentColor;
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) / canvas.width;
            const y = (event.clientY - rect.top) / canvas.height;
            context.lineTo(x * canvas.width, y * canvas.height);
            context.stroke();
            context.beginPath();
            context.moveTo(x * canvas.width, y * canvas.height);
            currentPath.push({ x, y, color: currentColor, size: currentBrushSize });
        }

        canvas.addEventListener('mousedown', () => { drawing = true; currentPath = []; history.push(currentPath); });
        canvas.addEventListener('mouseup', () => { drawing = false; context.beginPath(); });
        canvas.addEventListener('mousemove', draw);

        document.getElementById('color-picker').addEventListener('input', event => { currentColor = event.target.value; });
        document.getElementById('brush-size').addEventListener('input', event => { currentBrushSize = event.target.value; });

        document.getElementById('exit-button').addEventListener('click', () => {
            document.getElementById('carousel-container').style.display = 'flex';
            document.getElementById('editor').style.display = 'none';
        });

        document.getElementById('save-button').addEventListener('click', () => {
            showPromptDialog();
        });

        function showPromptDialog() {
            const promptDialog = document.createElement('div');
            promptDialog.id = 'prompt-dialog';
            promptDialog.innerHTML = `
                <div id="prompt-content">
                    <label for="alcohol-input">请描述你留言之前喝了多少酒:</label>
                    <input type="text" id="alcohol-input" />
                    <button id="prompt-ok-button">确定</button>
                </div>
            `;
            document.body.appendChild(promptDialog);

            document.getElementById('prompt-ok-button').addEventListener('click', async () => {
                const alcoholInput = document.getElementById('alcohol-input').value;
                if (alcoholInput) {
                    saveDrawing(alcoholInput);
                    document.body.removeChild(promptDialog);
                } else {
                    alert('请填写喝酒信息后再保存。');
                }
            });
        }

        async function saveDrawing(alcoholInput) {
            try {
                const batch = db.batch();
                const drawingsRef = db.collection('posters').doc(currentPosterId).collection('drawings');

                history.forEach((path, pathIndex) => {
                    const pointRef = drawingsRef.doc();
                    const timestamp = Date.now();
                    const pathData = { points: path.map(point => ({ ...point, x: point.x / canvas.width, y: point.y / canvas.height })), pathIndex, alcoholInput, timestamp };
                    batch.set(pointRef, pathData);
                });

                await batch.commit();
                alert('Drawing saved');
            } catch (error) {
                console.error('Error saving drawing:', error);
            }
        }

        function resizeCanvas(img) {
            const width = window.innerWidth;
            const height = (img.height / img.width) * width;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            loadDrawings(img); // 重新加载绘制内容
        }

        window.addEventListener('resize', () => resizeCanvas(img));

        // 添加双指拖动功能
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
        });

        textInput.addEventListener('blur', () => {
            if (textInput.value) {
                const rect = canvas.getBoundingClientRect();
                const x = (textInput.offsetLeft - rect.left) / canvas.width;
                const y = (textInput.offsetTop - rect.top) / canvas.height;
                context.fillStyle = currentColor;
                context.font = '16px Arial';
                context.fillText(textInput.value, x * canvas.width, y * canvas.height);
                const timestamp = Date.now();
                history.push([{ type: 'text', text: textInput.value, x, y, color: currentColor, alcoholInput: '', timestamp }]);
                textInput.value = '';
            }
            textInput.style.display = 'none';
            isTextMode = false;
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
    }
});


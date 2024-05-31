document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 2; // 当前展示中间的海报索引
    const posters = document.querySelectorAll('.poster');
    let currentPosterId;

    // 从 Firebase Firestore 获取海报数据
    async function getPosters() {
        try {
            console.log("Fetching posters from Firestore...");
            const snapshot = await db.collection('posters').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log("Poster data:", data);
                let posterElement;
                if (doc.id === 'poster01') {
                    posterElement = document.getElementById('poster-3');
                } else if (doc.id === 'poster02') {
                    posterElement = document.getElementById('poster-4');
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
        console.log("Carousel updated. Current index:", currentIndex);
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
        document.getElementById('editor

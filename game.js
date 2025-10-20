// 게임 상태
let gameState = {
    playerCount: 4,
    players: [],
    raceFinished: false,
    finishOrder: [],
    previewNames: [] // 미리보기 이름 저장
};

// 캔버스 설정
let canvas, ctx;
let horses = [];
let particles = [];
let raceActive = false;
const FINISH_LINE = 0.9; // 캔버스의 90% 지점

// 색상 팔레트
const colors = [
    '#ff006e', // 핑크
    '#00f5ff', // 사이언
    '#8338ec', // 보라
    '#06ffa5', // 그린
    '#ffbe0b', // 노랑
    '#fb5607', // 오렌지
    '#ff006e', // 핑크2
    '#3a86ff'  // 블루
];

// Random name pool
const randomNames = [
    'Shadow', 'Phantom', 'Spirit', 'Specter', 'Wraith', 'Boo', 'Casper', 'Ghost',
    'Spooky', 'Mystic', 'Twilight', 'Eclipse', 'Lunar', 'Stellar', 'Nova', 'Comet',
    'Blaze', 'Flash', 'Thunder', 'Lightning', 'Storm', 'Frost', 'Inferno', 'Vortex',
    'Ninja', 'Samurai', 'Titan', 'Phoenix', 'Dragon', 'Griffin', 'Pegasus', 'Legend'
];

// 플레이어 수 변경
function changePlayerCount(delta) {
    const input = document.getElementById('playerCount');
    let newValue = parseInt(input.value) + delta;

    if (newValue >= 2 && newValue <= 8) {
        input.value = newValue;
        gameState.playerCount = newValue;
        updatePlayerPreview();
    }
}

// 플레이어 미리보기 업데이트
function updatePlayerPreview() {
    const previewContainer = document.getElementById('previewPlayers');
    const names = getRandomNames(gameState.playerCount);

    // 미리보기에서 생성한 이름을 gameState에 저장
    gameState.previewNames = names;

    previewContainer.innerHTML = `
        <div class="preview-title">👻 PLAYERS 👻</div>
        <div class="preview-list">
            ${names.map((name, index) => `
                <div class="preview-item" style="border-color: ${colors[index]}; color: ${colors[index]};">
                    <div class="player-number">Player ${index + 1}</div>
                    <div class="player-name">${name}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// 랜덤 이름 가져오기
function getRandomNames(count) {
    const shuffled = [...randomNames].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// 레이스 시작
function startRace() {
    // 미리보기에서 저장한 이름 사용
    const names = gameState.previewNames.length === gameState.playerCount
        ? gameState.previewNames
        : getRandomNames(gameState.playerCount);

    gameState.players = [];

    for (let i = 0; i < gameState.playerCount; i++) {
        gameState.players.push({
            name: names[i],
            color: colors[i],
            position: 0,
            speed: 0,
            lane: i,
            finished: false,
            finishPosition: null
        });
    }

    // 화면 전환
    switchScreen('raceScreen');

    // 캔버스 초기화
    initCanvas();

    // 카운트다운 시작
    startCountdown();
}

// 화면 전환
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 캔버스 초기화
function initCanvas() {
    canvas = document.getElementById('raceCanvas');
    ctx = canvas.getContext('2d');

    // 반응형 캔버스 크기
    const container = canvas.parentElement;
    canvas.width = Math.min(1000, container.clientWidth - 40);
    canvas.height = Math.min(600, gameState.playerCount * 80);

    // 말 초기화 (각 유령마다 고유한 기본 속도 부여)
    horses = gameState.players.map((player, index) => ({
        ...player,
        x: 50,
        y: (canvas.height / gameState.playerCount) * index + (canvas.height / gameState.playerCount) / 2,
        size: 30,
        baseSpeed: Math.random() * 4 + 2.5 // 2.5 ~ 6.5 사이의 고유 속도 (10초 이내 완주)
    }));
}

// 카운트다운
function startCountdown() {
    const countdownText = document.getElementById('countdownText');
    let count = 3;

    const countInterval = setInterval(() => {
        if (count > 0) {
            countdownText.textContent = count;
            playBeep();
            count--;
        } else {
            countdownText.textContent = 'GO!';
            playBeep(true);
            clearInterval(countInterval);

            setTimeout(() => {
                countdownText.textContent = '';
                startRaceAnimation();
            }, 500);
        }
    }, 1000);
}

// 사운드 효과 (beep)
function playBeep(isGo = false) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = isGo ? 800 : 600;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 레이스 애니메이션 시작
function startRaceAnimation() {
    raceActive = true;
    gameState.raceFinished = false;
    gameState.finishOrder = [];
    particles = [];

    animate();
}

// 메인 애니메이션 루프
function animate() {
    if (!raceActive) return;

    // 캔버스 클리어
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 트랙 그리기
    drawTrack();

    // 파티클 업데이트
    updateParticles();

    // 말 업데이트 및 그리기
    let allFinished = true;
    horses.forEach((horse, index) => {
        if (!horse.finished) {
            allFinished = false;

            // 고유 속도 기반 + 약간의 변동
            // baseSpeed를 중심으로 ±15% 변동 (순위가 더 명확하게, 최소 속도 보장)
            const variation = horse.baseSpeed * 0.3 * (Math.random() - 0.5);
            horse.speed = Math.max(2, horse.baseSpeed + variation); // 최소 속도 2 보장
            horse.x += horse.speed;

            // 파티클 생성 (유령 트레일)
            if (Math.random() > 0.6) {
                createGhostTrail(horse.x, horse.y, horse.color);
            }

            // 골인 체크
            if (horse.x >= canvas.width * FINISH_LINE) {
                horse.finished = true;
                horse.finishPosition = gameState.finishOrder.length + 1;
                gameState.finishOrder.push({
                    name: horse.name,
                    position: horse.finishPosition,
                    color: horse.color
                });

                // 골인 폭죽
                createFireworks(canvas.width * FINISH_LINE, horse.y, horse.color);
                playBeep(true);
            }
        }

        drawHorse(horse);
    });

    // 레이스 종료 체크
    if (allFinished) {
        raceActive = false;
        setTimeout(() => {
            showResults();
        }, 2000);
    } else {
        requestAnimationFrame(animate);
    }
}

// 트랙 그리기
function drawTrack() {
    const laneHeight = canvas.height / gameState.playerCount;

    // 레인 구분선
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    for (let i = 1; i < gameState.playerCount; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneHeight);
        ctx.lineTo(canvas.width, i * laneHeight);
        ctx.stroke();
    }

    // 출발선
    ctx.strokeStyle = '#06ffa5';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, canvas.height);
    ctx.stroke();

    // 골인선
    ctx.strokeStyle = '#ff006e';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width * FINISH_LINE, 0);
    ctx.lineTo(canvas.width * FINISH_LINE, canvas.height);
    ctx.stroke();

    ctx.setLineDash([]);
}

// 유령 그리기 (픽셀 스타일)
function drawHorse(horse) {
    const size = horse.size;
    const time = Date.now() * 0.003;

    // 떠다니는 애니메이션
    const floatY = Math.sin(time + horse.lane) * 8;
    const baseY = horse.y + floatY;

    // 투명도 애니메이션
    const opacity = 0.85 + Math.sin(time * 2 + horse.lane) * 0.15;

    ctx.save();
    ctx.globalAlpha = opacity;

    // 네온 글로우 효과
    ctx.shadowColor = horse.color;
    ctx.shadowBlur = 20;

    // 유령 몸통 (둥근 머리)
    ctx.fillStyle = horse.color;
    ctx.beginPath();
    ctx.arc(horse.x + size/2, baseY - size/3, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 유령 하체 (물결 모양)
    ctx.beginPath();
    ctx.moveTo(horse.x - size * 0.1, baseY);

    // 물결 꼬리
    for (let i = 0; i <= 3; i++) {
        const waveX = horse.x + (size * 0.3 * i);
        const waveY = baseY + size * 0.3 + Math.sin(time * 3 + i) * 5;
        ctx.lineTo(waveX, waveY);
    }

    ctx.lineTo(horse.x + size, baseY - size * 0.2);
    ctx.lineTo(horse.x + size, baseY - size/3);
    ctx.lineTo(horse.x - size * 0.1, baseY - size/3);
    ctx.closePath();
    ctx.fill();

    // 눈 (검은 점)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(horse.x + size * 0.2, baseY - size * 0.5, 5, 5);
    ctx.fillRect(horse.x + size * 0.5, baseY - size * 0.5, 5, 5);

    ctx.restore();

    // 플레이어 이름
    ctx.fillStyle = horse.color;
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.shadowColor = horse.color;
    ctx.shadowBlur = 10;
    ctx.fillText(horse.name, horse.x + size/2, baseY - size - 10);
    ctx.shadowBlur = 0;
}

// 유령 트레일 파티클 생성
function createGhostTrail(x, y, color) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x - 10 + Math.random() * 10,
            y: y + Math.random() * 20 - 10,
            vx: -Math.random() * 1.5 - 0.5,
            vy: Math.random() * 1 - 0.5,
            life: 40,
            color: color,
            size: Math.random() * 8 + 4,
            alpha: 0.6
        });
    }
}

// 폭죽 파티클 생성
function createFireworks(x, y, color) {
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = Math.random() * 3 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 60,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

// 파티클 업데이트
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            const alpha = (p.life / 60) * (p.alpha || 1);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;

            // 유령 트레일은 원형으로
            if (p.size > 6) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            ctx.globalAlpha = 1;
        }
    }
}

// 결과 표시
function showResults() {
    switchScreen('resultScreen');

    const resultList = document.getElementById('resultList');
    resultList.innerHTML = '';

    gameState.finishOrder.forEach((result, index) => {
        setTimeout(() => {
            const item = document.createElement('div');
            item.className = `result-item`;

            // 순위별 클래스 추가
            if (index === 0) item.classList.add('rank-1');
            else if (index === 1) item.classList.add('rank-2');
            else if (index === 2) item.classList.add('rank-3');
            else if (index === gameState.finishOrder.length - 1) item.classList.add('rank-last');

            // 메달/배지
            let badge = '';
            if (index === 0) badge = '🥇';
            else if (index === 1) badge = '🥈';
            else if (index === 2) badge = '🥉';
            else if (index === gameState.finishOrder.length - 1) badge = '💀';
            else badge = '👻';

            item.innerHTML = `
                <div class="result-rank" style="color: ${result.color}">#${result.position}</div>
                <div class="result-name" style="color: ${result.color}">${result.name}</div>
                <div class="result-badge">${badge}</div>
            `;

            resultList.appendChild(item);
            playBeep(index === 0);
        }, index * 200);
    });
}

// 다시 시작
function restartGame() {
    gameState.raceFinished = false;
    gameState.finishOrder = [];
    horses = [];
    particles = [];
    raceActive = false;

    startRace();
}

// 홈으로
function goHome() {
    gameState.raceFinished = false;
    gameState.finishOrder = [];
    horses = [];
    particles = [];
    raceActive = false;

    switchScreen('startScreen');
    updatePlayerPreview();
}

// 페이지 로드 시 미리보기 초기화
window.addEventListener('DOMContentLoaded', () => {
    updatePlayerPreview();
});

// 네이버 비디오 감지 및 추출
function detectNaverVideos() {
    const moduleScripts = document.querySelectorAll('script[class="__se_module_data"]');
    const videos = [];
    
    moduleScripts.forEach((script) => {
        const dataModule = script.getAttribute('data-module');
        
        if (dataModule) {
            try {
                const data = JSON.parse(dataModule);
                
                if (data.type === 'v2_video' && 
                    data.data && 
                    data.data.videoType === 'player' && 
                    data.data.vid && 
                    data.data.inkey) {
                    
                    const title = data.data.mediaMeta?.title || 'Unknown Video';
                    
                    videos.push({
                        title: title,
                        vid: data.data.vid,
                        inkey: data.data.inkey,
                        thumbnail: data.data.thumbnail,
                        id: `${data.data.vid}_${data.data.inkey}`
                    });
                }
            } catch (e) {
                // 파싱 오류는 무시 (정상적인 스크립트일 수 있음)
            }
        }
    });
    
    return videos;
}

// 중복 제거
function removeDuplicateVideos(videos) {
    const seen = new Set();
    return videos.filter(video => {
        if (seen.has(video.id)) {
            return false;
        }
        seen.add(video.id);
        return true;
    });
}

// 안전한 메시지 전송 함수
function sendMessageSafely(message) {
    try {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                // 연결 끊김은 정상 상황 (팝업이 닫혔을 때 등)
            }
        });
    } catch (error) {
        console.error('네동줍줍: 메시지 전송 오류:', error);
    }
}

// 비디오 감지 및 background로 전송
function detectAndSendVideos() {
    const videos = detectNaverVideos();
    const uniqueVideos = removeDuplicateVideos(videos);
    
    if (uniqueVideos.length > 0) {
        console.log(`🎬 네동줍줍: ${uniqueVideos.length}개의 비디오 감지됨`);
        
        sendMessageSafely({
            type: 'VIDEOS_DETECTED',
            videos: uniqueVideos,
            url: window.location.href
        });
    } else {
        sendMessageSafely({
            type: 'NO_VIDEOS',
            url: window.location.href
        });
    }
}

// 디바운스 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 디바운스된 감지 함수
const debouncedDetect = debounce(detectAndSendVideos, 1000);

// MutationObserver로 동적 변화 감지
const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // script 태그가 추가되었거나, script 태그를 포함하는 요소가 추가된 경우
                    if (node.matches && node.matches('script[class="__se_module_data"]')) {
                        shouldCheck = true;
                    } else if (node.querySelector && node.querySelector('script[class="__se_module_data"]')) {
                        shouldCheck = true;
                    }
                }
            });
        }
    });
    
    if (shouldCheck) {
        debouncedDetect();
    }
});

// iframe인지 메인 프레임인지 확인
const isIframe = window !== window.top;
console.log(`현재 프레임: ${isIframe ? 'iframe' : '메인 프레임'}`);

// 페이지 로드 완료 후 초기 감지
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(detectAndSendVideos, 1000);
    });
} else {
    setTimeout(detectAndSendVideos, 1000);
}

// MutationObserver 시작
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 페이지 변경 감지 (SPA 대응)
let currentUrl = window.location.href;
setInterval(() => {
    if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        setTimeout(detectAndSendVideos, 2000); // 페이지 변경 후 2초 뒤 감지
    }
}, 1000);

console.log('네동줍줍 Content Script 로드됨');

// iframe에서 비디오 감지 시도
if (isIframe) {
    setTimeout(detectAndSendVideos, 5000);
} 
// DOM 요소들
let loadingEl, noVideosEl, videosContainerEl, errorEl, errorMessageEl;
let videoCountEl, videosListEl, downloadAllBtn, refreshBtn, retryBtn;

let currentVideos = [];
let currentTabId = null;

// DOM이 로드된 후 요소들 초기화
function initializeElements() {
    loadingEl = document.getElementById('loading');
    noVideosEl = document.getElementById('no-videos');
    videosContainerEl = document.getElementById('videos-container');
    errorEl = document.getElementById('error');
    errorMessageEl = document.getElementById('error-message');
    videoCountEl = document.getElementById('video-count');
    videosListEl = document.getElementById('videos-list');
    downloadAllBtn = document.getElementById('download-all-btn');
    refreshBtn = document.getElementById('refresh-btn');
    retryBtn = document.getElementById('retry-btn');
}

// 파일명에 사용할 수 없는 문자 제거
function sanitizeFilename(filename) {
    return filename.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 네이버 API로부터 실제 비디오 URL 가져오기
async function getVideoUrl(vid, inkey) {
    const apiUrl = `https://apis.naver.com/rmcnmv/rmcnmv/vod/play/v2.0/${vid}?key=${inkey}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.videos || !data.videos.list || !data.videos.list[0]) {
            throw new Error('비디오 정보를 찾을 수 없습니다');
        }
        
        // 비디오 품질별로 필터링 (thumbnail 제외)
        const videoList = data.videos.list.filter(video => {
            const source = video.source || '';
            const type = video.type || '';
            
            // thumbnail 관련 URL/타입 제외
            const isThumbnail = source.toLowerCase().includes('thumbnail') || 
                               type.toLowerCase().includes('thumbnail') ||
                               source.toLowerCase().includes('thumb') ||
                               source.toLowerCase().includes('preview');
            
            // 비디오 파일 확장자 확인
            const hasVideoExtension = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)/.test(source.toLowerCase());
            
            return !isThumbnail && (hasVideoExtension || source.includes('rmcnmv'));
        });
        
        console.log('전체 비디오 목록:', data.videos.list);
        console.log('필터링된 비디오 목록:', videoList);
        
        if (videoList.length === 0) {
            throw new Error('다운로드 가능한 비디오를 찾을 수 없습니다');
        }
        
        // 가장 높은 품질의 비디오 선택 (첫 번째가 보통 최고 품질)
        const videoUrl = videoList[0].source.replace("∈", "&");
        console.log('선택된 비디오 URL:', videoUrl);
        
        return videoUrl;
    } catch (error) {
        console.error('비디오 URL 가져오기 실패:', error);
        throw error;
    }
}

// 비디오 다운로드 (동시 다운로드 지원)
async function downloadVideo(video, button) {
    const downloadText = button.querySelector('.download-text');
    const downloadProgress = button.querySelector('.download-progress');
    
    // 이미 다운로드 중인 경우 중복 실행 방지
    if (button.disabled) {
        return;
    }
    
    try {
        // 버튼 상태 변경
        button.disabled = true;
        downloadText.style.display = 'none';
        downloadProgress.style.display = 'inline';
        downloadProgress.textContent = '준비 중...';
        
        // 실제 비디오 URL 가져오기
        downloadProgress.textContent = 'URL 가져오는 중...';
        const videoUrl = await getVideoUrl(video.vid, video.inkey);
        
        // 파일명 생성 (중복 방지를 위해 타임스탬프 추가)
        const safeTitle = sanitizeFilename(video.title);
        const timestamp = new Date().getTime();
        const filename = `${safeTitle}_${timestamp}.mp4`;
        
        // 다운로드 시작
        downloadProgress.textContent = '다운로드 시작...';
        
        chrome.downloads.download({
            url: videoUrl,
            filename: filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
            }
            
            console.log(`다운로드 시작됨: ${filename} (ID: ${downloadId})`);
            
            // 성공 상태로 변경
            downloadProgress.textContent = '다운로드 시작됨!';
            downloadProgress.style.color = '#4CAF50';
            
            setTimeout(() => {
                button.disabled = false;
                downloadText.style.display = 'inline';
                downloadProgress.style.display = 'none';
                downloadProgress.style.color = '';
            }, 3000);
        });
        
    } catch (error) {
        console.error('다운로드 실패:', error);
        
        // 에러 상태로 변경
        downloadProgress.textContent = '다운로드 실패';
        downloadProgress.style.color = '#f44336';
        
        setTimeout(() => {
            button.disabled = false;
            downloadText.style.display = 'inline';
            downloadProgress.style.display = 'none';
            downloadProgress.style.color = '';
        }, 3000);
        
        // 에러 알림 (중복 방지)
        if (!document.querySelector('.error[style*="block"]')) {
            showError(`다운로드 실패: ${error.message}`);
        }
    }
}

// 모든 비디오 다운로드 (동시 다운로드 지원)
async function downloadAllVideos() {
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = '모두 다운로드 중...';
    
    try {
        // 모든 다운로드를 동시에 시작
        const downloadPromises = currentVideos.map(async (video) => {
            const button = document.querySelector(`[data-vid="${video.vid}"]`);
            if (button && !button.disabled) {
                return downloadVideo(video, button);
            }
        });
        
        // 모든 다운로드가 완료될 때까지 대기
        await Promise.allSettled(downloadPromises);
        
    } catch (error) {
        console.error('일괄 다운로드 실패:', error);
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = '📥 모두 다운로드';
    }
}

// 비디오 카드 생성
function createVideoCard(video) {
    const template = document.getElementById('video-card-template');
    const card = template.content.cloneNode(true);
    
    // 썸네일 설정
    const thumbnailImg = card.querySelector('.thumbnail-img');
    if (video.thumbnail) {
        thumbnailImg.src = video.thumbnail;
        thumbnailImg.onerror = () => {
            thumbnailImg.style.display = 'none';
        };
    } else {
        thumbnailImg.style.display = 'none';
    }
    
    // 제목 설정
    const titleEl = card.querySelector('.video-title');
    titleEl.textContent = video.title;
    titleEl.title = video.title; // 전체 제목을 툴팁으로
    
    // 다운로드 버튼 설정
    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.setAttribute('data-vid', video.vid);
    downloadBtn.setAttribute('data-inkey', video.inkey);
    downloadBtn.setAttribute('data-title', video.title);
    
    downloadBtn.addEventListener('click', () => {
        downloadVideo(video, downloadBtn);
    });
    
    return card;
}

// 비디오 목록 표시
function displayVideos(videos) {
    currentVideos = videos;
    
    // 개수 업데이트
    videoCountEl.textContent = `${videos.length}개의 비디오 발견`;
    
    // 리스트 초기화
    videosListEl.innerHTML = '';
    
    // 비디오 카드들 추가
    videos.forEach(video => {
        const card = createVideoCard(video);
        videosListEl.appendChild(card);
    });
    
    // 상태 표시
    showVideosContainer();
}

// UI 상태 관리
function showLoading() {
    hideAllStates();
    loadingEl.style.display = 'block';
}

function showNoVideos() {
    hideAllStates();
    noVideosEl.style.display = 'block';
}

function showVideosContainer() {
    hideAllStates();
    videosContainerEl.style.display = 'block';
}

function showError(message) {
    hideAllStates();
    errorMessageEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideAllStates() {
    loadingEl.style.display = 'none';
    noVideosEl.style.display = 'none';
    videosContainerEl.style.display = 'none';
    errorEl.style.display = 'none';
}

// 현재 탭의 비디오 정보 로드
async function loadCurrentTabVideos() {
    try {
        showLoading();
        
        // 현재 활성 탭 가져오기
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTabId = tab.id;
        
        // Storage에서 해당 탭의 비디오 정보 가져오기
        const storageKey = `videos_${currentTabId}`;
        const result = await chrome.storage.local.get([storageKey]);
        const videos = result[storageKey] || [];
        
        if (videos.length > 0) {
            displayVideos(videos);
        } else {
            showNoVideos();
        }
        
    } catch (error) {
        console.error('비디오 로드 실패:', error);
        showError('비디오 정보를 불러오는데 실패했습니다.');
    }
}

// 새로고침
async function refreshVideos() {
    if (currentTabId) {
        // Content script에 새로고침 요청
        try {
            await chrome.tabs.sendMessage(currentTabId, { type: 'REFRESH_VIDEOS' });
            setTimeout(loadCurrentTabVideos, 1000);
        } catch (error) {
            // Content script가 없는 경우 페이지 새로고침
            chrome.tabs.reload(currentTabId);
        }
    }
}

// 도움말 및 피드백 링크는 DOMContentLoaded에서 처리
function initializeEventListeners() {
    document.getElementById('help-link').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ 
            url: 'https://github.com/your-username/nabijupjup#사용법' 
        });
    });

    document.getElementById('feedback-link').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ 
            url: 'https://github.com/your-username/nabijupjup/issues' 
        });
    });
}

// Storage 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && currentTabId) {
        const storageKey = `videos_${currentTabId}`;
        if (changes[storageKey]) {
            const newVideos = changes[storageKey].newValue || [];
            if (newVideos.length > 0) {
                displayVideos(newVideos);
            } else {
                showNoVideos();
            }
        }
    }
});

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('네비줍줍 팝업 로드됨');
    
    try {
        // DOM 요소들 초기화
        initializeElements();
        
        // 도움말/피드백 링크 이벤트 리스너 등록
        initializeEventListeners();
        
        // 메인 버튼 이벤트 리스너 등록
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', downloadAllVideos);
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadCurrentTabVideos);
        }
        if (retryBtn) {
            retryBtn.addEventListener('click', loadCurrentTabVideos);
        }
        
        // 비디오 로드
        loadCurrentTabVideos();
        
    } catch (error) {
        console.error('팝업 초기화 오류:', error);
        showError('팝업 초기화 중 오류가 발생했습니다: ' + error.message);
    }
}); 
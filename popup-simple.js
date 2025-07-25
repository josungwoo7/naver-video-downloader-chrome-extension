console.log('네동줍줍 팝업 로드됨');

let currentVideos = [];
let currentTabId = null;
let debugLogs = []; // 디버그 로그 저장용 배열

// DOM 요소들
let statusEl, refreshBtn, downloadAllBtn, videoListEl, resultEl, debugInfoEl, debugContentEl;
let bugReportBtn, bugReportModal, modalClose, bugReportForm;

// DOM 요소 초기화
function initializeElements() {
    statusEl = document.getElementById('status');
    refreshBtn = document.getElementById('refresh-btn');
    downloadAllBtn = document.getElementById('download-all-btn');
    videoListEl = document.getElementById('video-list');
    resultEl = document.getElementById('result');
    debugInfoEl = document.getElementById('debug-info');
    debugContentEl = document.getElementById('debug-content');
    bugReportBtn = document.getElementById('bug-report-btn');
    bugReportModal = document.getElementById('bug-report-modal');
    modalClose = document.getElementById('modal-close');
    bugReportForm = document.getElementById('bug-report-form');
}

// 디버그 정보 표시 및 저장
function showDebugInfo(info) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${info}`;
    
    // 모든 디버그 로그를 배열에 저장 (버그신고용)
    debugLogs.push(logEntry);
    
    // 최대 100개까지만 저장 (메모리 절약)
    if (debugLogs.length > 100) {
        debugLogs.shift();
    }
    
    // CONFIG가 로드되었고 DEBUG_MODE가 활성화된 경우에만 화면에 표시
    if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG_MODE) {
        if (debugContentEl) {
            debugContentEl.innerHTML += logEntry + '<br>';
            debugInfoEl.style.display = 'block';
        }
        console.log('DEBUG:', info);
    }
}

// 파일명 정리 함수
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
        
        if (videoList.length === 0) {
            throw new Error('다운로드 가능한 비디오를 찾을 수 없습니다');
        }
        
        // 가장 높은 품질의 비디오 선택 (첫 번째가 보통 최고 품질)
        const videoUrl = videoList[0].source.replace("∈", "&");
        
        return videoUrl;
    } catch (error) {
        console.error('비디오 URL 가져오기 실패:', error);
        throw error;
    }
}

// 개별 비디오 다운로드
async function downloadVideo(vid, inkey, title, buttonElement) {
    const originalText = buttonElement.innerHTML;
    
    try {
        buttonElement.innerHTML = '🔄 URL 가져오는 중...';
        buttonElement.classList.add('downloading');
        buttonElement.disabled = true;
        
        const videoUrl = await getVideoUrl(vid, inkey);
        
        buttonElement.innerHTML = '📥 다운로드 중...';
        
        const safeTitle = sanitizeFilename(title);
        const timestamp = Date.now();
        const filename = `${safeTitle}_${timestamp}.mp4`;
        
        // Chrome 다운로드 API 사용
        chrome.downloads.download({
            url: videoUrl,
            filename: filename,
            conflictAction: 'uniquify'
                        }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        buttonElement.innerHTML = '❌ 실패';
                        buttonElement.classList.remove('downloading');
                        buttonElement.classList.add('error');
                        setTimeout(() => {
                            buttonElement.innerHTML = originalText;
                            buttonElement.classList.remove('error');
                            buttonElement.disabled = false;
                        }, 3000);
                    } else {
                        buttonElement.innerHTML = '✅ 완료';
                        buttonElement.classList.remove('downloading');
                        buttonElement.classList.add('completed');
                        setTimeout(() => {
                            buttonElement.innerHTML = originalText;
                            buttonElement.classList.remove('completed');
                            buttonElement.disabled = false;
                        }, 3000);
                    }
                });
        
            } catch (error) {
            buttonElement.innerHTML = '❌ 실패';
            buttonElement.classList.remove('downloading');
            buttonElement.classList.add('error');
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.classList.remove('error');
                buttonElement.disabled = false;
            }, 3000);
        }
}

// 모든 비디오 다운로드
async function downloadAll() {
    if (currentVideos.length === 0) return;
    
    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = '📥 모두 다운로드 중...';
    
    try {
        const downloadPromises = currentVideos.map(async (video, index) => {
            try {
                const videoUrl = await getVideoUrl(video.vid, video.inkey);
                const safeTitle = sanitizeFilename(video.title);
                const timestamp = Date.now();
                const filename = `${safeTitle}_${timestamp}_${index + 1}.mp4`;
                
                return new Promise((resolve) => {
                    chrome.downloads.download({
                        url: videoUrl,
                        filename: filename,
                        conflictAction: 'uniquify'
                                                }, (downloadId) => {
                                if (chrome.runtime.lastError) {
                                    resolve({ success: false, title: video.title });
                                } else {
                                    resolve({ success: true, title: video.title });
                                }
                            });
                                        });
                    } catch (error) {
                        return { success: false, title: video.title };
                    }
        });
        
        const results = await Promise.allSettled(downloadPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        resultEl.innerHTML = `✅ ${successful}/${currentVideos.length}개 다운로드 완료`;
        
                } catch (error) {
                resultEl.innerHTML = '❌ 일괄 다운로드 실패';
            } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = '📥 모두 다운로드';
    }
}

// 비디오 목록 표시
function displayVideos(videos) {
    showDebugInfo(`displayVideos 호출됨: ${videos.length}개 비디오`);
    
    currentVideos = videos;
    
    if (videos.length === 0) {
        statusEl.innerHTML = '감지된 비디오가 없습니다 📹';
        statusEl.className = 'status error';
        downloadAllBtn.style.display = 'none';
        videoListEl.innerHTML = '';
        showDebugInfo('비디오 없음 - Content Script가 제대로 작동하는지 확인하세요');
        return;
    }
    
    statusEl.innerHTML = `${videos.length}개의 비디오를 찾았습니다! ✅`;
    statusEl.className = 'status';
    downloadAllBtn.style.display = 'inline-block';
    
    videoListEl.innerHTML = videos.map((video, index) => `
        <div class="video-item">
            <div class="video-title">${video.title}</div>
            <div class="video-info">VID: ${video.vid.substring(0, 20)}...</div>
            <button class="download-btn" data-vid="${video.vid}" data-inkey="${video.inkey}" data-title="${video.title}">
                📥 다운로드
            </button>
        </div>
    `).join('');
    
    showDebugInfo(`비디오 목록 표시 완료: ${videos.length}개`);
}

// 현재 탭의 비디오 로드
function loadCurrentTabVideos() {
    showDebugInfo('loadCurrentTabVideos 시작');
    
    statusEl.innerHTML = '비디오를 검색 중... 🔍';
    statusEl.className = 'status loading';
    
    // 현재 탭 정보 가져오기
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (chrome.runtime.lastError) {
            showDebugInfo('탭 쿼리 실패: ' + chrome.runtime.lastError.message);
            statusEl.innerHTML = '탭 정보를 가져올 수 없습니다 ❌';
            statusEl.className = 'status error';
            return;
        }
        
        currentTabId = tabs[0].id;
        showDebugInfo(`현재 탭 ID: ${currentTabId}, URL: ${tabs[0].url}`);
        
        const storageKey = `videos_${currentTabId}`;
        
        // Storage에서 비디오 데이터 가져오기
        chrome.storage.local.get([storageKey], function(result) {
            if (chrome.runtime.lastError) {
                showDebugInfo('Storage 읽기 실패: ' + chrome.runtime.lastError.message);
                statusEl.innerHTML = 'Storage 읽기 실패 ❌';
                statusEl.className = 'status error';
                return;
            }
            
            const videos = result[storageKey] || [];
            showDebugInfo(`Storage에서 가져온 비디오 수: ${videos.length}`);
            
            // 약간의 지연 후 결과 표시 (Content Script가 데이터를 보낼 시간을 줌)
            setTimeout(() => {
                displayVideos(videos);
            }, 1000);
        });
    });
}

// 새로고침
function refreshVideos() {
    showDebugInfo('새로고침 시작');
    loadCurrentTabVideos();
    resultEl.innerHTML = '새로고침 완료';
}

// 버그 리포트 관련 함수들
function initializeBugReport() {
    try {
        // 설정 파일 로드 확인
        if (typeof CONFIG === 'undefined') {
            console.error('CONFIG 객체가 로드되지 않았습니다');
            return;
        }
        
        // EmailJS 초기화
        if (typeof emailjs !== 'undefined') {
            emailjs.init(CONFIG.EMAILJS.PUBLIC_KEY);
            console.log('EmailJS initialized successfully with config');
        } else {
            console.error('EmailJS library not loaded');
        }
    } catch (error) {
        console.error('EmailJS initialization failed:', error);
        // EmailJS 초기화 실패 시 무시 (mailto 폴백 사용)
    }
}

function openBugReportModal() {
    // 현재 URL 가져와서 폼에 채우기
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            document.getElementById('current-url').value = tabs[0].url;
        }
    });
    
    bugReportModal.style.display = 'block';
}

function closeBugReportModal() {
    bugReportModal.style.display = 'none';
    bugReportForm.reset();
}

async function submitBugReport(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-bug-report');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '📧 전송 중...';
        
        // 폼 데이터 수집
        const userEmail = document.getElementById('user-email').value || '미제공';
        const bugDescription = document.getElementById('bug-description').value;
        const currentUrl = document.getElementById('current-url').value;
        const timestamp = new Date().toLocaleString('ko-KR');
        const userAgent = navigator.userAgent;
        const extensionVersion = chrome.runtime.getManifest().version;
        
        // 디버그 로그 수집 (최근 10개)
        const recentDebugLogs = debugLogs.slice(-10).join('\n');
        
        // EmailJS 템플릿에 맞는 데이터 구성
        const templateParams = {
            title: `[네동줍줍 버그신고] ${timestamp}`,
            message: `
상세 설명:
${bugDescription}

=================== 디버그 로그 ===================
${recentDebugLogs || '디버그 로그 없음'}

=================== 기술 정보 ===================
발생 페이지: ${currentUrl}
신고 시간: ${timestamp}
확장프로그램 버전: ${extensionVersion}
브라우저 정보: ${userAgent}
사용자 이메일: ${userEmail}
============================================
            `.trim()
        };
        
        // EmailJS 사용 가능 여부 확인
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS library not available');
            throw new Error('EmailJS 라이브러리가 로드되지 않았습니다');
        }
        
        console.log('Sending email with EmailJS...');
        console.log('Template params:', templateParams);
        
        // EmailJS로 이메일 전송
        const response = await emailjs.send(
            CONFIG.EMAILJS.SERVICE_ID,      // Service ID
            CONFIG.EMAILJS.TEMPLATE_ID,     // Template ID
            templateParams
        );
        
        console.log('EmailJS response:', response);
        
        if (response.status === 200) {
            console.log('Email sent successfully');
            submitBtn.innerHTML = '✅ 전송 완료';
            resultEl.innerHTML = '✅ 버그 신고가 성공적으로 전송되었습니다!';
            
            setTimeout(() => {
                closeBugReportModal();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                resultEl.innerHTML = '';
            }, 3000);
        } else {
            throw new Error(`EmailJS 응답 오류: ${response.status}`);
        }
        
            } catch (error) {
            console.error('EmailJS sending failed:', error);
            // 오류 발생 시 mailto로 폴백
        
        const currentTimestamp = new Date().toLocaleString('ko-KR');
        const subject = `[네동줍줍 버그신고] ${currentTimestamp}`;
        const recentLogs = debugLogs.slice(-10).join('\n');
        const body = `
상세 설명:
${document.getElementById('bug-description').value}

=================== 디버그 로그 ===================
${recentLogs || '디버그 로그 없음'}

=================== 기술 정보 ===================
발생 페이지: ${document.getElementById('current-url').value}
신고 시간: ${currentTimestamp}
확장프로그램 버전: ${chrome.runtime.getManifest().version}
브라우저 정보: ${navigator.userAgent}
사용자 이메일: ${document.getElementById('user-email').value || '미제공'}

오류 정보: ${error.message}
============================================
        `.trim();
        
        const mailtoLink = `mailto:${CONFIG.BUG_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        chrome.tabs.create({ url: mailtoLink });
        
        submitBtn.innerHTML = '📧 이메일 앱으로 전송';
        resultEl.innerHTML = '⚠️ 직접 전송 실패 - 이메일 앱으로 전환됩니다';
        
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 3000);
    }
}

// 이벤트 위임을 사용한 다운로드 버튼 처리
function setupEventDelegation() {
    // 비디오 목록의 다운로드 버튼 처리
    videoListEl.addEventListener('click', function(e) {
        if (e.target.classList.contains('download-btn')) {
            const vid = e.target.dataset.vid;
            const inkey = e.target.dataset.inkey;
            const title = e.target.dataset.title;
            
            if (vid && inkey && title) {
                downloadVideo(vid, inkey, title, e.target);
            }
        }
    });
    
    // 새로고침 버튼
    refreshBtn.addEventListener('click', refreshVideos);
    
    // 모두 다운로드 버튼
    downloadAllBtn.addEventListener('click', downloadAll);
    
    // 버그 리포트 관련 이벤트
    bugReportBtn.addEventListener('click', openBugReportModal);
    modalClose.addEventListener('click', closeBugReportModal);
    bugReportForm.addEventListener('submit', submitBugReport);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(e) {
        if (e.target === bugReportModal) {
            closeBugReportModal();
        }
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    try {
        // DOM 요소 초기화
        initializeElements();
        
        // 초기 디버그 정보 기록
        showDebugInfo('팝업 초기화 시작');
        showDebugInfo(`확장프로그램 버전: ${chrome.runtime.getManifest().version}`);
        showDebugInfo(`브라우저: ${navigator.userAgent.split(' ').pop()}`);
        
        // 버그 리포트 초기화
        initializeBugReport();
        
        // 이벤트 리스너 설정
        setupEventDelegation();
        
        // 비디오 로드
        loadCurrentTabVideos();
        
        showDebugInfo('팝업 초기화 완료');
        
    } catch (error) {
        console.error('네동줍줍: 팝업 초기화 오류:', error);
        showDebugInfo(`팝업 초기화 오류: ${error.message}`);
    }
});

// Storage 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && currentTabId) {
        const storageKey = `videos_${currentTabId}`;
        if (changes[storageKey]) {
            const newVideos = changes[storageKey].newValue || [];
            showDebugInfo(`Storage 변경 감지: ${newVideos.length}개 비디오`);
            displayVideos(newVideos);
        }
    }
}); 
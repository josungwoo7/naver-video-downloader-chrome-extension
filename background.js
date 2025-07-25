// 확장프로그램 설치 시 초기화
chrome.runtime.onInstalled.addListener(() => {
    // 기본적으로 비활성화된 아이콘으로 설정
    chrome.action.setIcon({
        path: {
            16: 'icons/icon16_disabled.png',
            48: 'icons/icon48_disabled.png',
            128: 'icons/icon128_disabled.png'
        }
    });
});

// Content script로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'VIDEOS_DETECTED') {
        handleVideosDetected(message.videos, sender.tab.id);
        sendResponse({success: true, message: 'Videos processed successfully'});
    } else if (message.type === 'NO_VIDEOS') {
        handleNoVideos(sender.tab.id);
        sendResponse({success: true, message: 'No videos processed'});
    }
    
    // 응답을 위해 true 반환 (비동기 응답 처리)
    return true;
});

// 비디오가 감지되었을 때 처리
function handleVideosDetected(videos, tabId) {
    // 배지에 비디오 개수 표시
    chrome.action.setBadgeText({
        text: videos.length.toString(),
        tabId: tabId
    });
    
    // 배지 색상 설정
    chrome.action.setBadgeBackgroundColor({
        color: '#4CAF50',
        tabId: tabId
    });
    
    // 아이콘 활성화 (밝게)
    chrome.action.setIcon({
        path: {
            16: 'icons/icon16.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png'
        },
        tabId: tabId
    });
    
    // Storage에 비디오 정보 저장 (탭별로)
    const storageKey = `videos_${tabId}`;
    chrome.storage.local.set({
        [storageKey]: videos
    });
    
    // 중요한 비디오 감지 로그만 유지
    if (videos.length > 0) {
        console.log(`🎬 네동줍줍: 탭 ${tabId}에서 ${videos.length}개의 비디오 감지됨`);
    }
}

// 비디오가 없을 때 처리
function handleNoVideos(tabId) {
    // 배지 제거
    chrome.action.setBadgeText({
        text: '',
        tabId: tabId
    });
    
    // 아이콘을 비활성화 상태로 설정 (회색조, 투명)
    chrome.action.setIcon({
        path: {
            16: 'icons/icon16_disabled.png',
            48: 'icons/icon48_disabled.png',
            128: 'icons/icon128_disabled.png'
        },
        tabId: tabId
    });
    
    // Storage에서 해당 탭의 비디오 정보 제거
    const storageKey = `videos_${tabId}`;
    chrome.storage.local.remove([storageKey]);
    

}

// 탭이 닫힐 때 storage 정리
chrome.tabs.onRemoved.addListener((tabId) => {
    const storageKey = `videos_${tabId}`;
    chrome.storage.local.remove([storageKey]);
});

// 탭이 업데이트될 때 (새로고침 등) storage 정리
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        // 배지 초기화
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
        
        // 아이콘을 비활성화 상태로 초기화
        chrome.action.setIcon({
            path: {
                16: 'icons/icon16_disabled.png',
                48: 'icons/icon48_disabled.png',
                128: 'icons/icon128_disabled.png'
            },
            tabId: tabId
        });
        
        // Storage 정리
        const storageKey = `videos_${tabId}`;
        chrome.storage.local.remove([storageKey]);
    }
});

 
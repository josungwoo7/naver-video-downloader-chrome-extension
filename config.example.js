// 네동줍줍 확장 프로그램 설정 예시 파일
// 이 파일을 config.js로 복사한 후 실제 값으로 수정하세요.

window.CONFIG = {
    // EmailJS 설정
    EMAILJS: {
        PUBLIC_KEY: "YOUR_EMAILJS_PUBLIC_KEY",
        SERVICE_ID: "YOUR_SERVICE_ID", 
        TEMPLATE_ID: "YOUR_TEMPLATE_ID"
    },
    
    // 버그 신고 이메일 주소
    BUG_REPORT_EMAIL: "your-email@example.com",
    
    // 기타 설정
    DEBUG_MODE: false  // 개발 시에는 true로 설정
};

console.log('네동줍줍: 설정 파일 로드됨'); 
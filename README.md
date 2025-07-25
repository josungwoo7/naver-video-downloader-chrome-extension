# 네동줍줍 (Naver Video Downloader) 🎬

네이버 카페와 블로그의 동영상을 쉽게 다운로드할 수 있는 Chrome 확장프로그램입니다.


## 스크린샷
<img width="459" height="605" alt="image" src="https://github.com/user-attachments/assets/fd28a922-b36d-49bc-9e92-be56e4be92f8" />

## ✨ 주요 기능

- 🔍 **자동 비디오 감지**: 네이버 카페/블로그 페이지의 동영상을 자동으로 감지
- 📱 **직관적인 UI**: 깔끔하고 사용하기 쉬운 팝업 인터페이스
- 🎯 **스마트 아이콘**: 비디오 감지 상태에 따른 동적 아이콘 변경
- 📁 **의미있는 파일명**: 영상 제목으로 자동 파일명 설정 + 타임스탬프
- 📦 **동시 다운로드**: 여러 영상을 동시에 다운로드 (Promise.allSettled 사용)
- 🚀 **실시간 감지**: 페이지 변경 시 자동으로 새로운 영상 감지 (MutationObserver)
- 🐛 **버그 신고**: EmailJS를 통한 직접 버그 리포트 전송
- 🛡️ **썸네일 필터링**: 실제 비디오만 다운로드 (썸네일/미리보기 제외)
- 🖥️ **iframe 지원**: iframe 내부의 비디오도 감지 가능

## 🚀 설치 방법

### 개발자 모드로 설치

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단의 **개발자 모드** 토글 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 이 폴더(`extension`)를 선택
5. 설치 완료!

### Chrome 웹 스토어 설치 (출시 후)

Chrome 웹 스토어에서 "네동줍줍" 검색 후 설치

## 📖 사용법

### 1. 기본 사용법

1. 네이버 카페나 블로그에서 동영상이 있는 페이지로 이동
2. 확장프로그램 아이콘 확인:
   - 🟢 **컬러 아이콘 + 숫자 배지**: 비디오 감지됨
   - 🔘 **회색 아이콘**: 비디오 없음
3. 아이콘을 클릭해서 팝업 열기
4. 다운로드하고 싶은 영상의 **📥 다운로드** 버튼 클릭
5. 브라우저의 기본 다운로드 폴더에 저장됨

### 2. 동시 다운로드

- 팝업 상단의 **📥 모두 다운로드** 버튼으로 모든 영상을 동시에 다운로드
- 개별 다운로드 버튼들도 동시에 클릭 가능 (중복 다운로드 방지)
- 각 파일은 `제목_타임스탬프_순번.mp4` 형식으로 저장

### 3. 새로고침 및 버그 신고

- 영상이 감지되지 않을 때 **🔄 새로고침** 버튼 클릭
- 문제 발생 시 **🐛 버그 신고** 버튼으로 개발자에게 직접 리포트 전송

## 🎯 지원 사이트

- ✅ 네이버 카페 (cafe.naver.com)
- ✅ 네이버 블로그 (blog.naver.com)
- ✅ iframe 내부 콘텐츠 지원

## 🔧 기술적 세부사항

### 비디오 감지 방식

확장프로그램은 다음과 같은 HTML 요소를 감지합니다:

```html
<script type="text/data" class="__se_module_data" data-module="...">
```

이 요소의 `data-module` 속성에서 다음 정보를 추출합니다:
- `type: "v2_video"`
- `videoType: "player"`
- `vid`: 비디오 ID
- `inkey`: 인증 키
- `mediaMeta.title`: 비디오 제목
- `thumbnail`: 썸네일 이미지

### API 호출 및 필터링

네이버의 공식 비디오 API를 사용합니다:
```
https://apis.naver.com/rmcnmv/rmcnmv/vod/play/v2.0/{vid}?key={inkey}
```

**썸네일 필터링 로직:**
- 'thumbnail', 'thumb', 'preview' 키워드가 포함된 URL 제외
- 비디오 파일 확장자 (.mp4, .avi, .mov, .wmv, .flv, .webm, .mkv, .m4v) 확인
- `rmcnmv` 서비스 URL만 허용

### 파일명 생성 규칙

```javascript
// 개별 다운로드
제목_타임스탬프.mp4

// 일괄 다운로드  
제목_타임스탬프_순번.mp4

// 특수문자 처리
파일명의 \\/:*?"<>| 문자는 _로 변환
```

## 🛠️ 개발

### 개발 환경 설정

개발을 시작하기 전에 설정 파일을 구성해야 합니다:

#### 1. 설정 파일 생성

```bash
# config.example.js를 복사해서 config.js 생성
cp config.example.js config.js
```

#### 2. EmailJS 설정

EmailJS는 버그 신고 기능에 사용됩니다. 다음 단계를 따라 설정하세요:

1. [EmailJS](https://www.emailjs.com/)에 회원가입
2. Email Service 생성 (Gmail, Outlook 등)
3. Email Template 생성
4. `config.js` 파일에 다음 정보 입력:

```javascript
window.CONFIG = {
    EMAILJS: {
        PUBLIC_KEY: "your_public_key",      // EmailJS Public Key
        SERVICE_ID: "your_service_id",      // Email Service ID
        TEMPLATE_ID: "your_template_id"     // Email Template ID
    },
    BUG_REPORT_EMAIL: "your-email@example.com",  // 버그 신고 받을 이메일
    DEBUG_MODE: true  // 개발 시 true로 설정
};
```

#### 3. 보안 주의사항

- ⚠️ `config.js` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다
- 🔒 실제 키와 이메일 주소는 절대 공개 저장소에 올리지 마세요
- 📧 EmailJS Public Key는 클라이언트에서 사용하므로 비교적 안전하지만, 사용량 제한을 설정하는 것을 권장합니다

### 파일 구조

```
extension/
├── manifest.json           # 확장프로그램 설정 (Manifest V3)
├── content.js             # 페이지에서 비디오 감지
├── background.js          # 백그라운드 처리 (Service Worker)
├── popup-simple.html      # 팝업 UI (CSP 호환)
├── popup-simple.js        # 팝업 로직 (EmailJS 통합)
├── popup.css             # 팝업 스타일
├── config.js             # 설정 파일 (Git에서 제외됨)
├── config.example.js      # 설정 파일 예시
├── emailjs.min.js        # EmailJS 라이브러리 (로컬)
├── .gitignore           # Git 제외 파일 목록
└── icons/               # 아이콘들
    ├── icon16.png           # 활성화 아이콘
    ├── icon48.png
    ├── icon128.png
    ├── icon16_disabled.png  # 비활성화 아이콘
    ├── icon48_disabled.png
    └── icon128_disabled.png
```

### 주요 기능 및 최적화

- **MutationObserver**: 동적으로 추가되는 비디오 감지
- **Debouncing**: 중복 감지 방지 (1초 지연)
- **Chrome Storage API**: 탭별 비디오 정보 저장
- **Chrome Downloads API**: 파일 다운로드
- **이벤트 위임**: CSP 호환 이벤트 처리
- **Promise.allSettled**: 동시 다운로드 안정성
- **EmailJS**: 실시간 버그 리포트 전송

### 성능 최적화

- ✅ **로그 최적화**: 중요한 비디오 감지 로그만 출력
- ✅ **메모리 관리**: 탭 닫힘/업데이트 시 자동 Storage 정리
- ✅ **오류 처리**: 네트워크 오류 시 mailto 폴백
- ✅ **UI 최적화**: 버튼 상태 관리 및 피드백

## 🚨 문제 해결

### 비디오가 감지되지 않는 경우

1. 아이콘 상태 확인:
   - 회색 아이콘: 정상적으로 비디오가 없는 상태
   - 컬러 아이콘: 비디오 감지됨
2. 페이지를 새로고침해보세요
3. 확장프로그램 팝업에서 **🔄 새로고침** 버튼 클릭
4. iframe 내부 콘텐츠의 경우 5초 정도 기다려보세요

### 다운로드가 실패하는 경우

- **권한 없음**: 로그인이 필요한 비공개 영상일 수 있습니다
- **만료된 링크**: 영상 링크가 만료되었을 수 있습니다 (vid/inkey 갱신 필요)
- **CORS 오류**: 네트워크 연결을 확인해주세요
- **썸네일 다운로드**: 필터링 로직으로 방지됨

### 확장프로그램이 작동하지 않는 경우

1. Chrome 확장프로그램 페이지(`chrome://extensions/`)에서 활성화 상태 확인
2. 페이지 새로고침 후 재시도
3. 확장프로그램 재설치
4. **🐛 버그 신고** 기능으로 개발자에게 문의

## 📋 필요한 권한

- `activeTab`: 현재 탭의 내용 접근
- `downloads`: 파일 다운로드
- `storage`: 데이터 임시 저장
- `https://apis.naver.com/*`: 네이버 API 호출
- `https://api.emailjs.com/*`: 버그 리포트 전송
- `https://cafe.naver.com/*`: 네이버 카페 접근
- `https://blog.naver.com/*`: 네이버 블로그 접근

## 🔒 개인정보 보호

- ✅ 로컬에서만 동작하며 외부 서버로 데이터를 전송하지 않습니다
- ✅ 네이버의 공식 API만 사용합니다
- ✅ 사용자의 개인정보를 수집하지 않습니다
- ✅ 버그 리포트는 사용자가 직접 선택한 경우에만 전송됩니다

## 🐛 버그 신고 기능

내장된 버그 신고 시스템을 통해 개발자에게 직접 리포트를 전송할 수 있습니다:

### 자동 수집 정보
- 버그 제목 및 상세 설명 (사용자 입력)
- 현재 페이지 URL
- 확장프로그램 버전
- 브라우저 정보
- 신고 시간
- 사용자 이메일 (선택사항)

### 전송 방식
- **1차**: EmailJS를 통한 직접 전송
- **2차**: 실패 시 mailto 링크로 폴백

### 개발자 연락처
- **이메일**: dalmooria@gmail.com

## 📄 라이선스

MIT License

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 만듭니다 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋합니다 (`git commit -am '새 기능 추가'`)
4. 브랜치에 푸시합니다 (`git push origin feature/새기능`)
5. Pull Request를 생성합니다

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면:

1. **🐛 버그 신고**: 확장프로그램 내 버그 신고 기능 사용 (권장)
2. **GitHub Issues**: [Issues](https://github.com/josungwoo7/naver-video-downloader-chrome-extension/issues)에 등록
3. **이메일**: dalmooria@gmail.com

---

## 📈 버전 히스토리

### v1.0.0 (현재)
- ✅ 기본 비디오 감지 및 다운로드
- ✅ 동적 아이콘 변경 (활성화/비활성화)
- ✅ 동시 다운로드 지원
- ✅ 썸네일 필터링
- ✅ iframe 지원
- ✅ 버그 신고 시스템 (EmailJS)
- ✅ CSP 호환 UI
- ✅ 성능 최적화 (로그 정리)

### 향후 계획
- 🔄 다운로드 진행률 표시
- 🔄 비디오 화질 선택
- 🔄 일괄 다운로드 폴더 선택
- 🔄 다운로드 히스토리 

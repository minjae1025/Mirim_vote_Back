import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIJ9D_fJ2FXHnu4ohdU8yRU4Opa8VWrdM",
    authDomain: "mirim-vote.firebaseapp.com",
    projectId: "mirim-vote",
    storageBucket: "mirim-vote.firebasestorage.app",
    messagingSenderId: "658989284035",
    appId: "1:658989284035:web:8f4b59916b31adfc7f8076"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfoDiv = document.getElementById('userInfo');

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // 로그인 성공
            const user = result.user;

            // ID 토큰 가져오기
            user.getIdToken().then((idToken) => {
                // console.log("ID Token:", idToken);

                // 백엔드 서버로 ID 토큰 전송
                fetch('/auth/google', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: idToken }),
                })
                    .then(response => response.json())
                    .then(data => {
                        // console.log('Backend response:', data);
                        updateUI(data);
                    })
                    .catch(error => console.error('Error sending token to backend:', error));
            });
        })
        .catch((error) => {
            console.error("Authentication failed.", error);
        });
});

// 로그아웃 버튼 클릭 이벤트
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        updateUI(null);
        console.log('로그아웃 성공');
    }).catch((error) => {
        console.error('로그아웃 실패', error);
    });
});

// 인증 상태 변경 감지
auth.onAuthStateChanged((user) => {
    if (auth.currentUser) {
        const uid = user.uid;
        fetch('/auth/getUser', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'uid': uid
            })
        })
            .then(response => response.json())
            .then(data => {
                updateUI(data.user);
            })
            .catch(error => console.error("uid of non-existent user"))
    }


});

function updateUI(user) {
    if (user && user.uid != null) {
        userInfoDiv.innerHTML = `
                    <h3>환영합니다, ${user.displayName}님!</h3>
                    <p>이메일: ${user.email}</p>
                    <p>구분: ${user.type}</p>
                    <p>생성 날짜 : ${user.createDate}</p>
                    <img src="${user.photoURL}" alt="프로필 사진" style="width:100px; border-radius:50%;">
                `;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        userInfoDiv.innerHTML = '';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}
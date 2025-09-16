import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import express from 'express';
import cors from 'cors';
import url from 'url';
import path from 'path';
import serviceAccount from "./adminsdk.json" with { type: "json" };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
const db = getFirestore(app);
const auth = admin.auth();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'static')));

//유저 정보 불러오기
app.post('/auth/getUser', async (req, res) => {
    try {
        // 1. req.uid가 아닌 req.body.uid를 사용해야 합니다.
        const uid = req.body.uid;

        if (!uid) {
            return;
            // return res.status(400).send({ error: "UID는 필수입니다." });
        }

        const userDoc = await db.collection("users").doc(uid).get();

        if (!userDoc.exists) {
            return;
            // return res.status(404).send({ error: "유저를 찾을 수 없습니다." });
        }

        const userData = userDoc.data();

        res.status(200).send({
            user: userData
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// '/auth/google' : 프론트엔드에서 받은 ID 토큰을 검증
app.post('/auth/google', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ error: 'ID 토큰이 필요합니다.' });
    }

    try {
        // ID 토큰 검증
        const decodedToken = await auth.verifyIdToken(token);
        // console.log(decodedToken);
        const { uid, email, name, picture } = decodedToken;

        //email에서 @ 뒤에서부터 확인
        const userDomain = email.slice(email.indexOf('@') + 1);
        if (userDomain != 'e-mirim.hs.kr') {
            //403 에러 전송
            res.status(403).send({
                message: '학교 계정만 가능합니다.'
            });

            //외부 계정은 자동 삭제
            auth.deleteUser(uid)
                .then(() => {
                    console.log('외부 계정이므로 자동 탈퇴됩니다.');
                })
                .catch((error) => {
                    console.log('삭제도중 실패:', error);
                });
            return;
        }

        const userData = await userFind(uid, email, name, picture);
        console.log(userData);

        // 프론트엔드에 성공 응답 전송
        res.status(200).send({
            message: 'Login Success!',
            user: userData
        });

    } catch (error) {
        console.error('ID 토큰 검증 실패:', error);
        res.status(401).send({ error: '인증되지 않은 사용자입니다.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});


//로그인 시도할 때, 기존 사용자인지 새로운 사용자인지 확인 후 DB추가 및 불러오기
async function userFind(uid, email, name, picture) {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    //만약 존재한다면 구글에서 사용자의 이름만 가져옴.
    if (userDoc.exists) {
        console.log(`기존에 존재하는 사용자입니다.: ${uid}`);
        const userRecord = await auth.getUser(uid)
            .then((userRecord) => {
                return userRecord.toJSON();
            })
        const userData = (await db.collection("users").doc(uid).get()).data();
        userData.displayName = userRecord.displayName;
        await db.collection('users').doc(userData.uid).set(userData);
        return userData;
    }
    else {
        console.log(`새로운 사용자입니다.: ${uid}`);
        const date = new Date();
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        
        const createDate = year + "/" + month + "/" + day;


        const userData = {
            uid: uid,
            email: email,
            displayName: name,
            photoURL: picture,
            createDate: createDate
        };

        if (/^s|d\d/.test(userData.email)) {
            userData.type = "student";
        }
        else {
            userData.type = "teacher";
        }

        await db.collection('users').doc(userData.uid).set(userData);
        return userData;
    }
}


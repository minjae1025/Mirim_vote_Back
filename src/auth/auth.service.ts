import { Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from "./adminsdk.json";
import { error } from 'console';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = getFirestore();
const auth = admin.auth();

@Injectable()
export class AuthService {

    async getUser(body) {
        try {
            const uid = body.uid;

            if (!uid) {
                return { error: "UID는 필수입니다." };
            }

            const userDoc = await db.collection("users").doc(uid).get();

            if (!userDoc.exists) {
                return { error: "유저를 찾을 수 없습니다." };
            }

            const userData = userDoc.data();

            return {
                user: userData
            };
        } catch (error) {
            console.error("Error fetching user:", error);
            return { error: "Internal Server Error" };
        }
    }

    async authLogin(body) {
        console.log(body);
        const { token } = body;


        if (!token) {
            return { error: 'ID 토큰이 필요합니다.' };
        }

        try {
            // ID 토큰 검증
            const decodedToken = await auth.verifyIdToken(token);
            // console.log(decodedToken);
            const { uid, email, name, picture } = decodedToken;

            //email에서 @ 뒤에서부터 확인
            const userDomain = email!.slice(email!.indexOf('@') + 1);
            if (userDomain != 'e-mirim.hs.kr') {
                auth.deleteUser(uid)
                    .then(() => {
                        console.log('외부 계정이므로 자동 탈퇴됩니다.');
                    })
                    .catch((error) => {
                        console.log('삭제도중 실패:', error);
                    });
                //403 에러 전송
                return {
                    message: '학교 계정만 가능합니다.',
                    uid: null
                };

            }

            const userData = await this.userFind(uid, email!, name, picture!);
            console.log(userData);

            // 프론트엔드에 성공 응답 전송
            return userData;

        } catch (error) {
            console.error('ID 토큰 검증 실패:', error);
            return { error: '인증되지 않은 사용자입니다.' };
        }
    }

    //로그인 시도할 때, 기존 사용자인지 새로운 사용자인지 확인 후 DB추가 및 불러오기
    async userFind(uid: string, email: string, name: string, picture: string) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        //만약 존재한다면 구글에서 사용자의 이름만 가져옴.
        if (userDoc.exists) {
            console.log(`기존에 존재하는 사용자입니다.: ${uid}`);
            try {
                const userRecord = await auth.getUser(uid);

                const userData = await (await db.collection("users").doc(uid).get()).data();
                if (userData && userData.displayName != userRecord.displayName) {
                    const newDisplayName = userRecord.displayName;
                    userData.displayName = newDisplayName;
                    await db.collection('users').doc(userData.uid).set(userData);
                    return userData;
                }
                else {
                    return userData;
                }
            }
            catch (error) {
                console.error("통신과정에서 문제가 발생 : ", error);
            };


        }
        else {
            console.log(`새로운 사용자입니다.: ${uid}`);
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const createDate = year + "/" + month + "/" + day;


            const userData = {
                uid: uid,
                email: email,
                displayName: name,
                photoURL: picture,
                createDate: createDate
            };

            if (/(s|d)\d{4}/.test(userData.email)) {
                userData['type'] = "student";
            }
            else {
                userData['type'] = "teacher";
            }

            await db.collection('users').doc(userData.uid).set(userData);
            return userData;
        }
    }



}

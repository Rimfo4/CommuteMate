import { setStorage, getStorage } from './db.js';

// 객체 데이터 저장 (자동으로 JSON 변환됨)
// 일단은 평문으로 저장.(혼자서 사용하는 애플리케이션이기에 때문.)
const userProfile = {
  name: 'ㅈㅈㅁ',
  password: '1234',
  place: [],
  firstStart: true,
};
setStorage('user', userProfile);

//user가 선택한 위젯들을 모아놓은 stroge임.
const widgetList = { widgets: [] };
setStorage('widgetList', widgetList);

// 데이터 읽어오기 (자동으로 객체로 변환됨)
const savedUser = getStorage('user');
console.log(savedUser);

const savedList = getStorage('widgetList');
console.log(savedList);

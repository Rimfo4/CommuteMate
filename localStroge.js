import { setStorage, getStorage } from './db.js';

//최대 5MB 정도 저장가능함.

// 객체 데이터 저장 (자동으로 JSON 변환됨)
// 일단은 평문으로 저장.(혼자서 사용하는 애플리케이션이기에 때문.)
const userProfile = {
  name: '',
  password: '',
  place: [],
  firstStart: true,
  //user가 선택한 위젯들을 모아놓은 stroge임.
  widgetList: [],
  alarm: [],
};
//widgetList: [
//   { name: 'weather', type: '1' },
//   { name: 'note', type: '1' },
//   { name: 'traffic', type: '2' },
// ],
// setStorage('user', userProfile);
if (!getStorage('user')) {
  setStorage('user', userProfile);
}

// 데이터 읽어오기 (자동으로 객체로 변환됨)
const savedUser = getStorage('user');
console.log(savedUser);

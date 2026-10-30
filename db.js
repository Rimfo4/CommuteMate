// localstorage.js의 데이터 저장, 가져오기, 삭제 기능을 한번에 모아둬서 쉽게 쓰기.

// 데이터를 안전하게 저장하는 함수
export function setStorage(key, value) {
  try {
    // 객체나 배열도 자동으로 문자열로 변환하여 저장
    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error('로컬스토리지 저장 실패:', error);
  }
}

// 데이터를 가져오는 함수
export function getStorage(key) {
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    // JSON 구조라면 파싱해서 객체/배열로 반환, 아니면 일반 문자열 반환
    return JSON.parse(data);
  } catch {
    return data;
  }
}

//  데이터 삭제
// export function removeStorage(key) {
//   localStorage.removeItem(key);
// }

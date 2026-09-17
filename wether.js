import wetherApiKey from './key.js';
const SERVICE_KEY = wetherApiKey;
const BASE_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// 위경도 -> 기상청 격자(nx, ny) 변환
function convertToGrid(lat, lon) {
  //기상청이 고정한 상수들임.
  const RE = 6371.00877, //지구의 반지름값.
    GRID = 5.0; //격자의 간격
  //표준 위도
  const SLAT1 = 30.0,
    SLAT2 = 60.0,
    //기준점.
    OLON = 126.0,
    OLAT = 38.0;
  //기준점의 격자 좌표
  const XO = 43,
    YO = 136;
  //라디안 값으로 변환임.
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra_lat = lat * DEGRAD;
  let ra = Math.tan(Math.PI * 0.25 + ra_lat * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

// base_date / base_time 계산 (가장 최근 발표시각)
function getBaseDateTime() {
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  const now = new Date();
  let hour = now.getHours();
  let minute = now.getMinutes();

  let candidate = baseTimes.filter(
    (t) => hour > t || (hour === t && minute >= 10),
  );
  let baseDate = new Date(now);
  let baseHour;

  if (candidate.length === 0) {
    baseDate.setDate(baseDate.getDate() - 1);
    baseHour = 23;
  } else {
    baseHour = candidate[candidate.length - 1];
  }

  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  const baseDateStr = `${y}${m}${d}`;
  const baseTimeStr = String(baseHour).padStart(2, '0') + '00';

  return { baseDate: baseDateStr, baseTime: baseTimeStr };
}

function filterFromNow(items) {
  const now = new Date();
  const nowStr =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const nowTimeStr = String(now.getHours()).padStart(2, '0') + '00';

  let filterItem = items.filter((item) => {
    const itemDateTime = item.fcstDate + item.fcstTime;
    const nowDateTime = nowStr + nowTimeStr;
    return itemDateTime >= nowDateTime && item.fcstDate === nowStr;
  });
  // console.log(filterItem);
  return filterItem;
}
async function fetchWeather(lat, lon) {
  const { nx, ny } = convertToGrid(lat, lon);
  // baseDate => 조회 가능한 기준 날짜.
  // baseTime => 기준 시간.
  const { baseDate, baseTime } = getBaseDateTime();
  console.log(convertToGrid(lat, lon));
  console.log(getBaseDateTime());

  //URLSearchParams는 JS 내장 인터페이스 유틸임
  // => 즉 URL의 쿼리를 추가, 수정, 읽기를 매우 쉽게 해주느 효자임.
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    pageNo: '1',
    numOfRows: '300',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx,
    ny: ny,
  });
  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('API 응답 오류: ' + res.status);

  const json = await res.json();
  console.log(json);
  // ? => 확실하지 않다는 의미 (null 일수있음.)라고 생각하면 편함. => 예외처리 해야한다는 것.
  const header = json?.response?.header;
  if (!header || header.resultCode !== '00') {
    throw new Error(header?.resultMsg || '데이터 오류');
  }

  return json.response.body.items.item;
}

// 같은 시각에 여러 정보(습도, 온도)를 하나의 객체로 그룹핑하기
function groupTime(item) {
  let result = {};
  for (let r of item) {
    // console.log(r);
    const time = r.fcstDate + r.fcstTime;

    if (!result[time]) {
      result[time] = {};
    }

    //result.time.r.category = 데이터 안에 데이터.
    result[time][r.category] = r.fcstValue;
  }
  // console.log(result);
  return result;
}

function getNowWetherType(data) {
  const nowTime = Object.keys(data)[0];
  const nowData = data[nowTime];

  //날씨 배열 0. 온도, 1.
  let WetherType = [];
  console.log(nowData.PTY);

  switch (+nowData.PTY) {
    case 1:
      return '비';
    case 2:
      return '비/눈';
    case 3:
      return '눈';
    case 4:
      return '소나기';
    case 0: {
      switch (+nowData.SKY) {
        case (1, 3):
          return '맑음';
        case 4:
          return '흐름';
      }
    }
  }
}
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    const { latitude, longitude } = pos.coords;
    // console.log(latitude, longitude);
    try {
      const items = await fetchWeather(latitude, longitude);
      const data = groupTime(filterFromNow(items));
      console.log(getNowWetherType(data));
    } catch (err) {
      document.getElementById('result').textContent = '실패: ' + err.message;
    }
  },
  () => {
    document.getElementById('result').textContent =
      '위치 권한이 거부되었습니다.';
  },
);

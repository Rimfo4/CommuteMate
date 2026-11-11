//네비게이션 관련 로직 모음 (카카오맵 불러오기, 주소 → 좌표, ODsay 경로 검색, 지도에 경로 그리기)
import { odsayKey, kakaoMapKey } from '../../key.js';
import { getStorage, setStorage } from '../../db.js';

const ODSAY_URL = 'https://api.odsay.com/v1/api';

// 경로 검색 결과 저장 (ODsay 일일 한도 아끼기)
// 저장 형식: routeCache = { '출발x,출발y>도착x,도착y': { savedAt: 저장 시각(ms), route: { info, subPath, lanes } } }
const ROUTE_CACHE_TIME = 6 * 60 * 60 * 1000; // 6시간 동안은 저장된 경로 사용
const ROUTE_CACHE_MAX = 10; // 경로 좌표가 커서 최근 10개까지만 저장

let kakaoReady = null; // 카카오맵 SDK는 한 번만 불러오기

// 카카오맵 SDK 불러오기 (키가 git에 안 올라가도록 script 태그를 JS로 붙임)
function loadKakaoMap() {
  if (kakaoReady) return kakaoReady;

  kakaoReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&libraries=services&autoload=false`;
    script.onload = () => kakao.maps.load(resolve); // autoload=false라서 직접 load
    script.onerror = () => reject(new Error('카카오맵을 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  return kakaoReady;
}

// 주소 → 좌표 { x: 경도, y: 위도 }
function getCoords(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve({ x: Number(result[0].x), y: Number(result[0].y) });
        return;
      }

      // 주소 형식이 아니면 장소 이름으로 한 번 더 찾기 (예: '미림마이스터고')
      const places = new kakao.maps.services.Places();
      places.keywordSearch(address, (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve({ x: Number(result[0].x), y: Number(result[0].y) });
        } else {
          reject(new Error(`'${address}' 위치를 찾지 못했습니다.`));
        }
      });
    });
  });
}

// ODsay API 호출 공통 함수
async function odsay(api, params) {
  const query = new URLSearchParams({ ...params, apiKey: odsayKey }); // 키의 +, / 를 자동으로 인코딩
  const res = await fetch(`${ODSAY_URL}/${api}?${query}`);
  const json = await res.json();

  if (json.error) {
    // error가 배열로 올 때와 객체로 올 때가 있음
    const error = Array.isArray(json.error) ? json.error[0] : json.error;
    throw new Error(error.message || error.msg || 'ODsay 요청 실패');
  }

  return json.result;
}

// 대중교통 경로 검색 → { info: 시간·요금, subPath: 구간들, lanes: 선 좌표 }
// 6시간 안에 같은 경로를 검색했으면 ODsay를 부르지 않고 저장된 결과를 씀
async function searchRoute(start, end) {
  const key = `${start.x},${start.y}>${end.x},${end.y}`;
  const cache = getStorage('routeCache') || {};

  const saved = cache[key];
  // 예전에 저장된 결과에는 경로 목록(paths)이 없어서 다시 받음
  if (
    saved &&
    saved.route.paths &&
    Date.now() - saved.savedAt < ROUTE_CACHE_TIME
  ) {
    return saved.route;
  }

  const route = await fetchRoute(start, end);

  cache[key] = { savedAt: Date.now(), route };

  // 오래된 것부터 지워서 최근 ROUTE_CACHE_MAX개만 남김
  const keys = Object.keys(cache).sort(
    (a, b) => cache[b].savedAt - cache[a].savedAt,
  );
  keys.slice(ROUTE_CACHE_MAX).forEach((oldKey) => delete cache[oldKey]);

  setStorage('routeCache', cache);
  return route;
}

// ODsay에 실제로 경로를 요청 (경로 검색 1번 + 경로 선 좌표 1번)
async function fetchRoute(start, end) {
  const result = await odsay('searchPubTransPathT', {
    SX: start.x,
    SY: start.y,
    EX: end.x,
    EY: end.y,
  });

  const path = result.path[0]; // 가장 추천하는 경로

  // 버스·지하철이 실제로 지나가는 길의 좌표
  const laneResult = await odsay('loadLane', {
    mapObject: `0:0@${path.info.mapObj}`,
  });

  return {
    info: path.info,
    subPath: path.subPath,
    lanes: laneResult.lane,
    paths: result.path.map(trimPath), // 대중교통 경로 목록 화면에서 씀
  };
}

// 지도에 경로 그리기. 전에 그린 선과 마커는 지우고 새로 그림
function drawRoute(map, route, start, end, drawn) {
  drawn.forEach((item) => item.setMap(null));
  drawn.length = 0;

  const bounds = new kakao.maps.LatLngBounds();
  const toLatLng = (x, y) => new kakao.maps.LatLng(y, x); // x=경도, y=위도 → LatLng는 순서가 반대

  // 버스·지하철 구간 (실선)
  route.lanes.forEach((lane) => {
    lane.section.forEach((section) => {
      const path = section.graphPos.map((pos) => toLatLng(pos.x, pos.y));
      path.forEach((point) => bounds.extend(point));

      drawn.push(
        new kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 6,
          strokeColor: '#2c3e8f',
          strokeOpacity: 0.9,
        }),
      );
    });
  });

  //걷는 구간 (점선). ODsay가 좌표를 안 줘서 정류장끼리 직선으로 이음
  //[출발지, 1구간 승차, 1구간 하차, 2구간 승차, ..., 도착지] → 두 개씩 짝지어 그림
  const stops = [start];
  route.subPath
    .filter((sub) => sub.trafficType !== 3) // 1 지하철, 2 버스, 3 도보
    .forEach((sub) => {
      stops.push(
        { x: sub.startX, y: sub.startY },
        { x: sub.endX, y: sub.endY },
      );
    });
  stops.push(end);

  for (let i = 0; i < stops.length; i += 2) {
    drawn.push(
      new kakao.maps.Polyline({
        map,
        path: [
          toLatLng(stops[i].x, stops[i].y),
          toLatLng(stops[i + 1].x, stops[i + 1].y),
        ],
        strokeWeight: 4,
        strokeColor: '#2c3e8f',
        strokeOpacity: 0.7,
        strokeStyle: 'shortdash',
      }),
    );
  }

  // 출발 = 파란 핀, 도착 = 빨간 핀 (핀 끝이 좌표에 오도록 offset을 아래 가운데로)
  const pinSize = new kakao.maps.Size(46, 62);
  const pinOption = { offset: new kakao.maps.Point(23, 62) };
  const pins = [
    { point: start, src: './assets/bluePing.svg' },
    { point: end, src: './assets/redPing.svg' },
  ];

  pins.forEach(({ point, src }) => {
    const position = toLatLng(point.x, point.y);
    bounds.extend(position);

    drawn.push(
      new kakao.maps.Marker({
        map,
        position,
        image: new kakao.maps.MarkerImage(src, pinSize, pinOption),
      }),
    );
  });

  map.setBounds(bounds); // 경로 전체가 화면에 들어오게
}

//@@@@@@@@@ 대중교통 경로 목록 (지도 위젯을 꾹 누르면 나오는 화면)@@@@@@@@@

//저장 용량을 줄이려고 경로 목록에는 화면에 필요한 값만 남김
function trimPath(path) {
  return {
    info: path.info,
    subPath: path.subPath.map((sub) => ({
      trafficType: sub.trafficType,
      sectionTime: sub.sectionTime,
    })),
  };
}

// 분 → '59분', '1시간', '1시간 20분'
function formatMinutes(min) {
  const hour = Math.floor(min / 60);
  const rest = min % 60;

  if (hour === 0) return `${rest}분`;
  return rest === 0 ? `${hour}시간` : `${hour}시간 ${rest}분`;
}

// Date → '07:17'
function formatClock(date) {
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${min}`;
}

// 정렬 기준: best = ODsay 추천순, time = 최소 시간, transfer = 최소 환승, walk = 최소 도보
function sortPaths(paths, sortBy) {
  const transfer = (p) => p.info.busTransitCount + p.info.subwayTransitCount;
  const rules = {
    time: (a, b) => a.info.totalTime - b.info.totalTime,
    transfer: (a, b) => transfer(a) - transfer(b),
    walk: (a, b) => a.info.totalWalk - b.info.totalWalk,
  };

  if (!rules[sortBy]) return paths; // best는 ODsay가 준 순서 그대로
  return [...paths].sort(rules[sortBy]);
}

// 구간 종류별 막대 색 (CSS 클래스): 1 지하철, 2 버스, 3 도보
const SEGMENT_CLASS = { 1: 'subway', 2: 'bus', 3: 'walk' };

// 경로 1개 카드: 총 시간, 환승·요금, 출발~도착 시각, 구간 막대
function makeRouteCard(path) {
  const now = new Date();
  const arrive = new Date(now.getTime() + path.info.totalTime * 60 * 1000);
  const transfer = path.info.busTransitCount + path.info.subwayTransitCount - 1; // 탄 횟수 - 1 = 환승 횟수

  const card = document.createElement('div');
  card.className = 'routeCard';
  card.innerHTML = `
    <div class="routeTop">
      <div class="routeTime">${formatMinutes(path.info.totalTime)}</div>
      <div class="routeExtra">
        ${transfer > 0 ? `환승 ${transfer}회` : '환승 없음'}<br />
        ${path.info.payment.toLocaleString()}원
      </div>
    </div>
    <div class="routeClock">${formatClock(now)} ~ ${formatClock(arrive)}</div>
    <div class="routeBar"></div>
  `;

  const bar = card.querySelector('.routeBar');

  path.subPath
    .filter((sub) => sub.sectionTime > 0) // 0분짜리 도보(같은 역 환승 등)는 막대에서 뺌
    .forEach((sub) => {
      const segment = document.createElement('div');
      segment.className = `routeSegment ${SEGMENT_CLASS[sub.trafficType]}`;
      segment.style.flexGrow = sub.sectionTime; // 구간 시간 비율만큼 막대 길이 (값마다 달라서 JS로 넣음)
      segment.textContent = formatMinutes(sub.sectionTime);
      bar.appendChild(segment);
    });

  return card;
}

export {
  loadKakaoMap,
  getCoords,
  searchRoute,
  drawRoute,
  sortPaths,
  makeRouteCard,
};

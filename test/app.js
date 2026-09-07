const ODSAY_API_KEY = '	TsgSkHceogtz%2BR3Z4aDF0w'; // 본인 ODsay 키 입력
const SEOUL_API_KEY = '서울데이터광장_발급키'; // 'sample' 대신 발급받은 키 입력

document.getElementById('searchBtn').addEventListener('click', async () => {
  const query = document.getElementById('stationInput').value.trim();
  const listEl = document.getElementById('resultList');

  if (!query) {
    alert('역이나 정류장 이름을 입력해주세요!');
    return;
  }

  listEl.innerHTML = '<li>조회 중...</li>';

  try {
    const cleanName = query.replace(/역$/, '');
    const targetUrl = `http://swopenAPI.seoul.go.kr/api/subway/${SEOUL_API_KEY}/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`;

    // 안정적인 allorigins 프록시로 변경
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const res = await fetch(proxyUrl);

    if (!res.ok) {
      throw new Error(`HTTP 에러 발생: ${res.status}`);
    }

    const data = await res.json();
    listEl.innerHTML = '';

    if (data.realtimeArrivalList && data.realtimeArrivalList.length > 0) {
      data.realtimeArrivalList.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `[${item.trainLineNm}] ${item.arvlMsg2}`;
        listEl.appendChild(li);
      });
    } else {
      listEl.innerHTML = '<li>도착 정보를 찾을 수 없습니다.</li>';
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<li>오류가 발생했습니다 (${err.message})</li>`;
  }
});

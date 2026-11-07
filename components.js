import { getWeather } from './weatherWidget.js';
import { getStorage, setStorage, removeStorage } from './db.js';
import './localStroge.js';

const widgetName = ['navigation', 'weather', 'alarm', 'note', 'traffic'];
const widgetKind = [
  '네비게이션',
  '날씨 보기',
  '알람',
  '업무 기록',
  '교통량 보기',
];

//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
class StartScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="startScreen">
    <p id = "tong">통근</p>
    <p>이</p></div>`;

    const userData = getStorage('user');
    console.log(userData);

    setTimeout(() => {
      this.hidden = true;
    }, 3000);
  }
}

// 상단 바 컴포넌트
class TopBar extends HTMLElement {
  //HTML에서 태그를 부를 때 실행되는 함수.
  connectedCallback() {
    this.innerHTML = `<div id="topColorBar"><div class="fontBold">통근이</div></div>`;
  }
}

// 하단 네비게이션 바 컴포넌트
class FootNavigationBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
       <button id="widgetAddBtn" class="footBtn"></button>
        <button id="homeBtn" class="footBtn"></button>
        <button id="settingBtn" class="footBtn"></button>
        
        `;

    //<div id = "widgetPopup">
    //   <div class="popupWidget">
    //     <widget-btn id="navigation"></widget-btn>
    //     <widget-btn id="weather"></widget-btn>
    //     <widget-btn id="alarm"></widget-btn>
    //     <widget-btn id="note"></widget-btn>
    //     <widget-btn id="traffic"></widget-btn>
    //   </div>
    // </div>
    const addBtn = document.getElementById('widgetAddBtn');
    const homeBtn = document.getElementById('homeBtn');
    const popup = document.getElementById('widgetPopup');

    // 위젯 추가 버튼 → 팝업 열기
    addBtn.addEventListener('click', () => {
      popup.classList.add('show');
    });

    // 홈 버튼 → 홈 페이지 이동
    homeBtn.addEventListener('click', () => {
      popup.classList.remove('show');
    });
  }
}

class Login extends HTMLElement {
  connectedCallback() {
    // <div class="title">사용자 확인</div>
    //   <form class="user">
    //     <div>
    //       <span id="usname">이름</span>
    //       <input id="name" type = "text" placeholder="이름을 입력해주세요"></input>
    //     </div>
    //   </br>
    //   <div>
    //     <span id="uspw">비밀번호</span>
    //     <input id="pw" type = "password" placeholder="비밀번호를 입력해주세요"></input>
    //   </div>
    //   </br>
    //     <button type="submit">로그인</button>
    //   </form>

    let title = document.createElement('div');
    title.innerHTML = '사용자 확인';
    title.id = 'formTitle';

    let form = document.createElement('div');
    form.innerHTML =
      '<form class="user"><div id="name"><span id="usname">이름</span><input id="usname" type = "text" placeholder="이름을 입력해주세요"></input></div></br><div id="pw"><span id="uspw">비밀번호</span><input id="uspw" type = "password" placeholder="비밀번호를 입력해주세요"></input></div></br><button type="submit">로그인</button></form>';

    this.appendChild(title);
    this.appendChild(form);
  }
}

class AddWidget extends HTMLElement {
  connectedCallback() {
    //div 가이드 추가 코드
    const noneDiv = document.createElement('div');
    noneDiv.id = 'none';
    noneDiv.style.marginTop = '140px';
    noneDiv.style.marginBottom = '70px';
    noneDiv.innerHTML = '원하는 위젯을<br>추가해주세요';

    //widget 스크롤
    const widgetScroll = document.createElement('widget-list');
    widgetScroll.hidden = true;

    noneDiv.addEventListener('click', () => {
      widgetScroll.classList.add('widgetSlideUp');
      widgetScroll.hidden = false;
    });

    const mainPartDiv = document.createElement('div');
    mainPartDiv.id = 'mainPart';
    mainPartDiv.appendChild(noneDiv);
    mainPartDiv.appendChild(widgetScroll);

    this.appendChild(mainPartDiv);

    // + 버튼처럼 바로 열어야 할 때 사용
    // if (this.hasAttribute('open')) openList();
  }
}

// 내용 컴포넌트
class Main extends HTMLElement {
  //얘는 한번 실행 후 끝.
  connectedCallback() {
    this.render();
  }

  //렌더 할때 마다 그리는 거임
  render() {
    this.innerHTML = ''; // 이전 화면 비우기
    const user = getStorage('user');

    if (user.firstStart) {
      const login = document.createElement('login-screen');
      this.appendChild(login);
    } else if (user.widgetList.length === 0) {
      const addWidget = document.createElement('add-widget');
      this.appendChild(addWidget);
    } else {
      document.querySelector('navigation-bar').hidden = false;

      //유저 데이터의 위젯 리스트 가지고 와서 뿌리기.
      const widgetBoard = document.createElement('div');
      widgetBoard.id = 'widgetBoard';

      user.widgetList.forEach((el) => {
        const widget = document.createElement(`${el.name}-widget`);
        widget.setAttribute('type', el.type);
        widgetBoard.appendChild(widget);
      });

      this.appendChild(widgetBoard);
    }
  }
}

// 저장된 배열을 기준으로 번호와 불빛을 다시 그림
function renderWidgetOrder() {
  const { widgetList } = getStorage('user');

  document.querySelectorAll('.widgetOrder').forEach((el) => el.remove());
  document
    .querySelectorAll('widget-btn .light')
    .forEach((el) => el.classList.remove('on'));

  widgetList.forEach((widget, index) => {
    const option = document.querySelector(
      `[data-name="${widget.name}"][data-type="${widget.type}"]`,
    );

    const order = document.createElement('div');
    order.className = 'widgetOrder';
    order.textContent = index + 1;
    option.appendChild(order);

    option.closest('widget-btn').querySelector('.light').classList.add('on');
  });
}

// 위젯을 눌렀을 때 배열을 바꾸고 localStorage에 저장
function toggleWidget(name, type) {
  const user = getStorage('user');
  const found = user.widgetList.find((widget) => widget.name === name);

  if (!found) {
    user.widgetList.push({ name, type }); // 처음 고른 위젯
  } else if (found.type === type) {
    user.widgetList = user.widgetList.filter((widget) => widget.name !== name); // 같은 크기를 다시 누르면 취소
  } else {
    found.type = type; // 다른 크기를 누르면 번호는 유지하고 크기만 변경
  }

  setStorage('user', user);
  renderWidgetOrder();
}

class WidgetList extends HTMLElement {
  connectedCallback() {
    const widgetList = document.createElement('div');
    widgetList.id = 'widgetList';
    widgetList.style.zIndex = '1000';

    for (let i in widgetName) {
      let nav = document.createElement(`widget-btn`);
      nav.id = i;
      nav.style.zIndex = '100';
      widgetList.appendChild(nav);
    }

    //확인 버튼
    const finishDiv = document.createElement('div');
    finishDiv.id = 'widgetSubmit';

    finishDiv.addEventListener('click', () => {
      const user = getStorage('user');
      // 고른 위젯이 없으면 넘어가지 않음
      if (user.widgetList.length === 0) return;

      user.firstStart = false;
      setStorage('user', user);

      this.closest('main-div').render();
    });

    this.appendChild(widgetList);
    this.appendChild(finishDiv);
    renderWidgetOrder(); // 새로고침 후 저장된 번호 복원
  }
}

class WidgetBtn extends HTMLElement {
  connectedCallback() {
    const id = this.id;

    // const widgetName = ['navigation', 'weather', 'alarm', 'note', 'traffic'];
    // const widgetKind = [
    //   '네비게이션',
    //   '날씨 보기',
    //   '알람',
    //   '업무 기록',
    //   '교통량 보기',
    // ];

    let text = `${widgetKind[id]}`;
    let tagName = `${widgetName[id]}-widget`;

    this.innerHTML = `
      <div class="widgetWrapper">
        <div class="widgetButton">
          <button type="button" class="vectorImg"></button>
          <div class="widgetText">${text}</div>
          <div class="light"></div>
        </div>
        <div class="widgetOption">
          <div class="optionBody">

            <div class="smallOption" data-name="${widgetName[id]}" data-type="1">
              <${tagName} type="1"></${tagName}>
            </div>

            <div class="bigOption" data-name="${widgetName[id]}" data-type="2">
              <${tagName} type="2"></${tagName}>
            </div>
          </div>
        </div>
      </div>
    `;

    const vectorImg = this.querySelector('.vectorImg');
    const option = this.querySelector('.widgetOption');
    const wrapper = this.querySelector('.widgetWrapper');

    vectorImg.addEventListener('click', () => {
      const isOpen = option.classList.toggle('show');

      vectorImg.classList.toggle('open', isOpen);
      wrapper.classList.toggle('expanded', isOpen);
    });

    this.querySelectorAll('.smallOption, .bigOption').forEach((option) => {
      option.addEventListener('click', () => {
        toggleWidget(option.dataset.name, option.dataset.type);
      });
    });
  }
}

// 업무 기록 위젯
class NoteWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="noteWidget">
        <div class="header">
          <div id="title">TO DO LIST</div>
          <input type="text" id="input" placeholder="할 일 입력" />
          <button id="addBtn">추가</button>
        </div>
        <div id="listContainer">
          <ul></ul>
        </div>
      </div>
    `;

    const ul = this.querySelector('ul'); // ul 태그 선택

    const input = this.querySelector('input'); // input 태그 선택
    const addBtn = this.querySelector('#addBtn');

    const LIMIT_TIME = 24 * 60 * 60 * 1000; // 24시간 -> 밀리초 계산

    // 리스트 띄우기
    function renderList() {
      ul.innerHTML = ''; // ul 태그 초기화
      let list = JSON.parse(localStorage.getItem('list')) || [];
      const now = Date.now(); // 밀리초 현재 시간

      list = list.filter((item) => {
        // 완료(true) + 완료 시간(not null)
        // 완료된 항목만 필터링
        if (item.completed && item.completedTime) {
          if (now - item.completedTime < LIMIT_TIME) {
            return true; // 24시간 미만 - 유지
          } else {
            return false; // 24시간 이상 - 제거
          }
        }
        return true; // 완료되지 않은 항목 유지
      });

      localStorage.setItem('list', JSON.stringify(list));

      for (let i = 0; i < list.length; i++) {
        const li = document.createElement('li');
        li.innerHTML = list[i].text;

        if (list[i].completed) {
          li.classList.add('completed');
        }
        li.addEventListener('click', () => completeList(i));

        ul.appendChild(li);
      }
    }

    function completeList(index) {
      const list = JSON.parse(localStorage.getItem('list')) || [];
      const now = Date.now();

      if (!list[index].completed) {
        list[index].completed = true;
        list[index].completedTime = now; // 완료 시간
      } else {
        list[index].completed = false;
        list[index].completedTime = null;
      }

      localStorage.setItem('list', JSON.stringify(list));

      renderList();
    }

    // 리스트 추가
    function addList() {
      const input_value = input.value.trim(); // 사용자가 입력한 값

      if (input_value === '') {
        return;
      }

      const list = JSON.parse(localStorage.getItem('list')) || [];
      list.push({
        text: input_value, // 사용자가 입력한 값 (string)
        completed: false, // 완료 여부 (boolean)
        createdAt: Date.now(), // 리스트 등록 시간 (number)
        completedTime: null, // 완료한 시간 (number)
      });
      localStorage.setItem('list', JSON.stringify(list)); // 배열 -> 문자열 => 저장

      renderList();

      // document.getElementById("input").value = ""; // 입력창 초기화
      input.value = '';
    }

    addBtn.addEventListener('click', addList);
    renderList();
  }
}

// 네비게이션 위젯
class NavigationWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class = "navigationWidget">
        <div id = "title">네비게이션</div>
      </div>
    `;
  }
}

class TrafficWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <!-- /* 데이터 불러오기 상태 표시 */ -->
    

    <div class="trafficWidget">
    <div id="trafficHeader">
      <div id="widgetTitle">교통정보</div>
      <div id="status"></div>
      <button type="button" class="repeatImg"></button>
    </div>
    <div id="trafficData"></div>

    </div>`;

    const repeatImg = this.querySelector('.repeatImg');

    repeatImg.addEventListener('click', async () => {
      // 현재 위치 좌표 변수 선언
      let currentLat = 0;
      let currentLng = 0;

      // 현재 위치를 가져오는 함수
      function getCurrentPosition() {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (error) => reject(error),
          );
        });
      }

      // 두 지점 간의 거리 계산 함수
      function getDistance(currentLat, currentLng, lat, lng) {
        function degToRad(deg) {
          // 각도(degree) -> 라디안(radian)
          return deg * (Math.PI / 180);
        }

        var R = 6371; // 지구에서 반지름 km로
        var dLat = degToRad(lat - currentLat);
        var dLng = degToRad(lng - currentLng);
        var a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(degToRad(currentLat)) *
            Math.cos(degToRad(lat)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var distance = R * c; // 거리 -> km로
        return distance;
      }

      // 현재 날짜 + 시각
      // const now = new Date();

      // const year = now.getFullYear();
      // const month = String(now.getMonth() + 1).padStart(2, "0");
      // const date = String(now.getDate()).padStart(2, "0");
      // const hour = String(now.getHours()).padStart(2, "0");
      // const min = String(now.getMinutes()).padStart(2, "0");

      // 사용자 현재 날짜(숫자 형)
      // const userDate = Number(`${year}${month}${date}${hour}${min}`);

      const status = this.querySelector('#status');
      const list = this.querySelector('#trafficData');

      status.textContent = '교통돌발정보를 불러오는 중...';
      list.replaceChildren(); // 새로운 정보로 업데이트

      try {
        // const position = await getCurrentPosition();

        // 현재 위치
        // currentLat = position.lat;
        // currentLng = position.lng;

        // 학교 위치
        currentLat = 37.4661018035835;
        currentLng = 126.931927855676;

        fetch('traffic.xml')
          .then((response) => response.text())
          .then((xmlString) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

            const records = [...xmlDoc.querySelectorAll('record')];

            if (records.length === 0) {
              const message = xml.querySelector('resultMsg')?.textContent;

              status.textContent =
                message ||
                '표시할 돌발정보가 없거나 API 응답을 확인해야 합니다.';

              console.log('UTIC 응답:', responseText);
              return;
            }

            let lat = '';
            let lng = '';
            let count = 0; // 사건 건수 카운트
            let startDate = '';
            let endDate = '';

            //사고 데이터 출력
            for (const record of records) {
              lat = record.querySelector('locationDataY')?.textContent;
              lng = record.querySelector('locationDataX')?.textContent;

              let between = getDistance(currentLat, currentLng, lat, lng);

              // ---년 --월 --일  --시 --분
              let startDate =
                record.querySelector('startDate')?.textContent || '';
              let endDate = record.querySelector('endDate')?.textContent || '';

              // 시작 시간이나 종료 시간이 없으면 건너뛰기
              if (!startDate || !endDate) {
                continue;
              }

              // 숫자형태로 바꾸기 (202610190034)
              startDate = Number(startDate.replace(/[^0-9]/g, ''));
              endDate = Number(endDate.replace(/[^0-9]/g, ''));

              // if (
              //   +between <= 3 &&
              //   startDate <= userDate &&
              //   userDate <= endDate
              // )
              if (between <= 5) {
                const title =
                  record.querySelector('incidentTitle')?.textContent ||
                  '제목 없음';

                const road =
                  record.querySelector('roadName')?.textContent || '';

                const address =
                  record.querySelector('addressNew')?.textContent ||
                  record.querySelector('addressJibun')?.textContent ||
                  '';

                const start =
                  record.querySelector('startDate')?.textContent || '';

                const type = record.querySelector('title');

                const item = document.createElement('article');
                const heading = document.createElement('h3');
                const detail = document.createElement('p');

                heading.textContent = title;
                detail.textContent = [road, address, start]
                  .filter(Boolean)
                  .join(' · ');

                item.append(heading, detail);
                list.appendChild(item);
                console.log(item);
                count++;
              }
            }
            status.textContent = `돌발정보 ${count}건을 불러왔습니다.`;
          });
      } catch (error) {
        console.error('API 요청 실패:', error);
        status.textContent = error.message;
      }
    });
  }
}

// 알람 위젯
class AlarmWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class = "alarmWidget">
        <div id = "title">알람</div>
      </div>
    `;
  }
}

//날씨 위젯.
class WeatherWidget extends HTMLElement {
  async connectedCallback() {
    // let type = this.getAttribute('type');

    const getTime = new Date();
    const nowWeather = await getWeather();

    this.innerHTML = ` <div id="weather">
          <div id="weather_1">
            <div id="type${nowWeather[2]}" class="weatherImg"></div>
            <div class="date">${getTime.getMonth() + 1}월 ${getTime.getDate()}일 금요일</div>
            <div class="time">${getTime.getHours().toString().padStart(2, '0')}:${getTime.getMinutes().toString().padStart(2, '0')}</div>
          </div>
          <div id="weather_2">
            <div
              style="display: flex; flex-direction: row; align-items: center">
              <div id="water" class='weatherImg'></div>
              <div id="humidity">${nowWeather[1]}%</div>
            </div>
            <div id="temp">${nowWeather[0]}°</div>
          </div>
        </div>  
          `;
  }
}

// 커스텀 태그를 정의한다는 의미.
customElements.define('start-screen', StartScreen);
customElements.define('login-screen', Login);
customElements.define('add-widget', AddWidget);
customElements.define('top-bar', TopBar);
customElements.define('navigation-bar', FootNavigationBar);
customElements.define('navigation-widget', NavigationWidget);
customElements.define('alarm-widget', AlarmWidget);
customElements.define('widget-btn', WidgetBtn);
customElements.define('note-widget', NoteWidget);
customElements.define('traffic-widget', TrafficWidget);
customElements.define('main-div', Main);
customElements.define('weather-widget', WeatherWidget);
customElements.define('widget-list', WidgetList);

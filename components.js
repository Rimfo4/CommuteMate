import { getWeather } from './weatherWidget.js';
import { getStorage, setStorage } from './db.js';
import './localStroge.js';

//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
class StartScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="startScreen"><p id = "tong">통근</p><p>이</p></div>`;

    setTimeout(() => {
      this.hidden = true;
    }, 1000);
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
    //   </div>
    // </div>
    const addBtn = document.getElementById('widgetAddBtn');
    const popup = document.getElementById('widgetPopup');

    // 열기 버튼 클릭
    addBtn.addEventListener('click', () => {
      popup.classList.add('show');
    });
  }
}

// 내용 컴포넌트
class Main extends HTMLElement {
  connectedCallback() {
    const user = getStorage('user');
    console.log(user);

    if (user.firstStart) {
      const noneDiv = document.createElement('div');
      noneDiv.id = 'none';
      noneDiv.style.marginTop = '140px';
      noneDiv.style.marginBottom = '70px';
      noneDiv.innerHTML = '원하는 위젯을<br>추가해주세요';

      const widgetScroll = document.createElement('widget-list');
      widgetScroll.hidden = true;

      noneDiv.addEventListener('click', () => {
        // noneDiv.classList.add('widgetSlideUp');
        widgetScroll.classList.add('widgetSlideUp');
        widgetScroll.hidden = false;
      });

      const mainPartDiv = document.createElement('div');
      mainPartDiv.id = 'mainPart';
      mainPartDiv.appendChild(noneDiv);
      mainPartDiv.appendChild(widgetScroll);

      this.appendChild(mainPartDiv);
    } 
    else {

      
    }
  }
}

class WidgetList extends HTMLElement {
  connectedCallback() {
    const widgetList = document.createElement('div');
    widgetList.id = 'widgetList';

    //유저가 선택한 위젯을 배열에 담고 => localStorage에 저장.
    const list = [];

    for (let i = 0; i < list.length; i++) {}
    list.push('navigation');
    let nav = document.createElement('widget-btn');
    nav.id = 'navigation';
    nav.style.zIndex = '100';
    widgetList.style.zIndex = '1000';

    widgetList.appendChild(nav);
    this.appendChild(widgetList);
  }
}

// 위젯 버튼 컴포넌트
class WidgetBtn extends HTMLElement {
  connectedCallback() {
    const id = this.id;

    let text = '';
    let tagName = '';

    if (id === 'navigation') {
      text = '네비게이션';
      tagName = 'navigation-widget';
    } else if (id === 'weather') {
      text = '날씨 보기';
      tagName = 'weather-widget';
    } else if (id === 'alarm') {
      text = '알람';
      tagName = 'alarm-widget';
    } else if (id === 'note') {
      text = '업무 기록';
      tagName = 'note-widget';
    }

    this.innerHTML = `<div id="widget">
        <div id="vectorImg"></div>
        <div id="widgetText">${text}</div>
        <div id="light"></div>
    </div>`;

    this.querySelector('#vectorImg').addEventListener('click', () => {
      this.innerHTML = `<${tagName}></${tagName}>`;
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
      <div class = "noteWidget">
        <div id = "title">네비게이션</div>
      </div>
    `;
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
customElements.define('top-bar', TopBar);
customElements.define('navigation-bar', FootNavigationBar);
customElements.define('widget-btn', WidgetBtn);
customElements.define('note-widget', NoteWidget);
customElements.define('main-div', Main);
customElements.define('weather-widget', WeatherWidget);
customElements.define('widget-list', WidgetList);

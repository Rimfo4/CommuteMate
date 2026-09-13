//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
class StartScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="startScreen"><p id = "tong">통근</p><p>이</p></div>`;

    setTimeout(() => {
      this.classList.add("hide");
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
    this.innerHTML = `<div id="footNavigationBar">
       <button id="widgetAddBtn" class="footBtn"></button>
        <button id="homeBtn" class="footBtn"></button>
        <button id="settingBtn" class="footBtn"></button></div>
        
        <div id = "widgetPopup">
          <div class="popupWidget">
            <widget-btn id="navigation"></widget-btn>
            <widget-btn id="weather"></widget-btn>
            <widget-btn id="alarm"></widget-btn>
            <widget-btn id="note"></widget-btn>
          </div>
        </div>`;

    const addBtn = document.getElementById("widgetAddBtn");
    const popup = document.getElementById("widgetPopup");

    // 열기 버튼 클릭
    addBtn.addEventListener("click", () => {
      popup.classList.add("show");
    });
  }
}

// 내용 컴포넌트
class Main extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id = "mainPart">
      <div id = "none">
        원하는 위젯을<br>추가해주세요
      </div>
    </div>`;
  }
}

// 위젯 버튼 컴포넌트
class WidgetBtn extends HTMLElement {
  connectedCallback() {
    const id = this.id;

    let text = "";
    let tagName = "";

    if (id === "navigation") {
      text = "네비게이션";
      tagName = "navigation-widget";
    } else if (id === "weather") {
      text = "날씨 보기";
      tagName = "weather-widget";
    } else if (id === "alarm") {
      text = "알람";
      tagName = "alarm-widget";
    } else if (id === "note") {
      text = "업무 기록";
      tagName = "note-widget";
    }

    this.innerHTML = `<div id="widget">
        <div id="vectorImg" id = id></div>
        <div id="widgetText">${text}</div>
        <div id="light"></div>
    </div>`;

    this.querySelector("#vectorImg").addEventListener("click", () => {
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
          <button id="addBtn" onclick="addList()">추가</button>
        </div>
        <div id="listContainer">
          <ul></ul>
        </div>
      </div>
    `;

    const ul = document.querySelector("ul"); // ul 태그 선택
    // 형식 :
    const input = document.querySelector("input"); // input 태그 선택

    const LIMIT_TIME = 24 * 60 * 60 * 1000; // 24시간 -> 밀리초 계산

    // 리스트 띄우기
    function renderList() {
      ul.innerHTML = ""; // ul 태그 초기화
      let list = JSON.parse(localStorage.getItem("list")) || [];
      const now = Date.now(); // 밀리초 현재 시간

      list = list.filter((item) => {
        // 완료(true) + 완료 시간(not null)
        // 완료된 항목만 필터링
        if (item.completed && item.completeTime) {
          if (now - item.completeTime < LIMIT_TIME) {
            return true; // 24시간 미만 - 유지
          } else {
            return false; // 24시간 이상 - 제거
          }
        }
        return true; // 완료되지 않은 항목 유지
      });

      localStorage.setItem("list", JSON.stringify(list));

      for (let i = 0; i < list.length; i++) {
        const li = document.createElement("li");
        li.innerHTML = list[i].text;

        if (list[i].completed) {
          li.classList.add("completed");
        }
        li.onclick = function () {
          // 클릭 시 완료 처리
          completeList(i);
        };

        ul.appendChild(li);
      }
    }

    function completeList(index) {
      const list = JSON.parse(localStorage.getItem("list")) || [];
      const now = Date.now();

      if (!list[index].completed) {
        list[index].completed = true;
        list[index].completeTime = now; // 완료 시간
      } else {
        list[index].completed = false;
        list[index].completeTime = null;
      }

      localStorage.setItem("list", JSON.stringify(list));

      renderList();
    }

    // 리스트 추가
    function addList() {
      const input_value = input.value.trim(); // 사용자가 입력한 값

      if (input_value === "") {
        return;
      }

      const list = JSON.parse(localStorage.getItem("list")) || [];
      list.push({
        text: input_value, // 사용자가 입력한 값 (string)
        completed: false, // 완료 여부 (boolean)
        createdAt: Date.now(), // 리스트 등록 시간 (number)
        completedTime: null, // 완료한 시간 (number)
      });
      localStorage.setItem("list", JSON.stringify(list)); // 배열 -> 문자열 => 저장

      renderList();

      // document.getElementById("input").value = ""; // 입력창 초기화
      input.value = "";
    }

    renderList();
  }
}
// 날씨 위젯
class WeatherWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class = "noteWidget">
        <div id = "title">날씨</div>
      </div>
    `;
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

// 커스텀 태그를 정의한다는 의미.
customElements.define("start-screen", StartScreen);
customElements.define("top-bar", TopBar);
customElements.define("navigation-bar", FootNavigationBar);
customElements.define("widget-btn", WidgetBtn);
customElements.define("note-widget", NoteWidget);
customElements.define("main-div", Main);

//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
class StartScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="startScreen"><p id = "tong">통근</p><p>이</p></div>`;

    setTimeout(() => {
      this.classList.add("hide");
    }, 3000);
  }
}

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
      <div class = "noteWidget">
        <div id = "title">TO DO LIST</div>
      </div>
    `;
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

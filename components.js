//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
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

// 위젯 버튼 컴포넌트
class WidgetBtn extends HTMLElement {
  connectedCallback() {
    const id = this.id;

    let text = "";

    if (id === "navigation") {
      text = "네비게이션";
    } else if (id === "weather") {
      text = "날씨 보기";
    } else if (id === "alarm") {
      text = "알람";
    } else if (id === "note") {
      text = "업무 기록";
    }

    this.innerHTML = `<div id="widget">
        <div id="vectorImg"></div>
        <div id="widgetText">${text}</div>
        <div id="light"></div>
    </div>`;
  }
}
// 커스텀 태그를 정의한다는 의미.
customElements.define("top-bar", TopBar);
customElements.define("navigation-bar", FootNavigationBar);
customElements.define("widget-btn", WidgetBtn);

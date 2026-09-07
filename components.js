//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
class TopBar extends HTMLElement {
  //HTML에서 태그를 부를 때 실행되는 함수.
  connectedCallback() {
    this.innerHTML = `<div id="topColorBar"><div class="fontBold">통근이</div></div>`;
  }
}

class FootNavigationBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="footNavigationBar">
        <button id="widgetAddBtn" class="footBtn"></button>
        <button id="homeBtn" class="footBtn"></button>
        <button id="settingBtn" class="footBtn"></button></div>`;
  }
}

class WidgetBtn extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="widget">
        <div id="thirdsImg"></div>
        <div id="widgetText">교통량 보기</div>
        <div id="light"></div>
    </div>`;
  }
}
// 커스텀 태그를 정의한다는 의미.
customElements.define('top-bar', TopBar);
customElements.define('navigation-bar', FootNavigationBar);
customElements.define('widget-btn', WidgetBtn);

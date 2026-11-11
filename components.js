import { getStorage, setStorage } from "./db.js";
import "./localStroge.js";
import { getWeather } from "./widgets/weather/weatherWidget.js";
import {
  loadKakaoMap,
  getCoords,
  searchRoute,
  drawRoute,
  sortPaths,
  makeRouteCard,
} from "./widgets/navigation/navigationWidget.js";
import {
  loadAlarms,
  pad,
  formatAlarmShort,
  openAlarmModal,
} from "./widgets/alarm/alarmWidget.js";

const widgetName = ["navigation", "weather", "alarm", "note", "traffic"];
const widgetKind = [
  "네비게이션",
  "날씨 보기",
  "알람",
  "업무 기록",
  "교통량 보기",
];

//리액트 처럼 component 형식으로 제작할 수 있는 순수 custom tag 기능.
// 통근이 시작 화면
class StartScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div id="startScreen"></div>`;

    const userData = getStorage("user");
    // console.log(userData);

    // 2초동안 화면 띄움
    setTimeout(() => {
      this.hidden = true;
    }, 2000);
  }
}

// 상단 바 컴포넌트
class TopBar extends HTMLElement {
  //HTML에서 태그를 부를 때 실행되는 함수.
  connectedCallback() {
    this.innerHTML = `<div id="topColorBar"><div id='tongLogo'></div></div>`;
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

    // + 버튼 → 위젯 추가 화면
    this.querySelector("#widgetAddBtn").addEventListener("click", () => {
      document.querySelector("main-div").render("addWidget");
    });

    // home 버튼 → Main의 if문 맨 아래 home 화면
    this.querySelector("#homeBtn").addEventListener("click", () => {
      const main = document.querySelector("main-div");

      // 이미 home 화면이면 다시 그리지 않음 (위젯이 새로 만들어지면서 API를 또 부르는 것 방지)
      if (main.screen === "home") return;

      main.render();
    });

    // 리스트 버튼 → 장소(주소) 수정 화면
    this.querySelector("#settingBtn").addEventListener("click", () => {
      document.querySelector("main-div").render("address");
    });
  }
}

// 사용자 확인 화면
class Login extends HTMLElement {
  connectedCallback() {
    let title = document.createElement("div");
    title.innerHTML = "사용자 확인";
    title.id = "formTitle";

    let form = document.createElement("div");
    form.innerHTML = `<form class="user"><div id="name"><span id="usname">이름</span><input id="usname" type = "text"></input></div></br><div id="pw"><span id="uspw">비밀번호</span><input id="uspw" type = "password"></input></div></br><div id="submit">저장</div></form>`;

    let sumbmitBtn = form.querySelector("#submit");

    //localStrage에 저장.
    sumbmitBtn.addEventListener("click", () => {
      const name = form.querySelector("input#usname").value.trim();
      const password = form.querySelector("input#uspw").value.trim();

      // 값 여부 조건
      if (name === "" || password === "") {
        alert("이름 또는 비밀번호를 작성해주세요.");
        return;
      }

      const user = getStorage("user");
      user.name = name;
      user.password = password;
      user.firstStart = false; // 다음부터 로그인 화면이 안 나오게
      setStorage("user", user);

      this.closest("main-div").render(); // Main의 if문 다시 실행 → 위젯 추가 화면
    });

    this.appendChild(title);
    this.appendChild(form);
  }
}

// 주소 입력 화면
class AddressScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="formTitle">주소를 입력해주세요</div>
      <div class="formSub">네비게이션에 사용합니다</div>
      <form class="address">
        <div class="formRow"><span>집</span><input type="text" data-name="집" /></div>
        <div class="formRow"><span>회사</span><input type="text" data-name="회사" /></div>
        <div class="formRow extra"><span>장소1</span><input type="text" data-name="장소1" /></div>
        <div class="formBottom">
          <div class="plusBtn"></div>
          <div id="submit">저장</div>
        </div>
      </form>`;

    const form = this.querySelector("form");
    const bottom = this.querySelector(".formBottom");

    // 장소 입력칸 하나 추가 (저장 버튼 위에)
    let placeCount = 1; // 처음 화면에 장소1부터 시작
    const addRow = (value = "") => {
      placeCount++;
      const row = document.createElement("div");
      row.className = "formRow extra";
      row.innerHTML = `<span>장소${placeCount}</span><input type="text" data-name="장소${placeCount}" />`;
      row.querySelector("input").value = value;
      form.insertBefore(row, bottom);
    };

    // + 버튼 → 장소 입력칸 추가
    this.querySelector(".plusBtn").addEventListener("click", () => addRow());

    // 저장된 장소가 있으면 입력칸에 채워 넣기 (하단바 리스트 버튼으로 다시 열었을 때)
    const saved = getStorage("user").place;
    const extras = saved.filter((p) => p.name !== "집" && p.name !== "회사");

    saved.forEach((p) => {
      if (p.name === "집" || p.name === "회사") {
        this.querySelector(`input[data-name="${p.name}"]`).value = p.address;
      }
    });

    extras.forEach((p, i) => {
      if (i === 0) {
        this.querySelector('input[data-name="장소1"]').value = p.address; // 첫 장소는 원래 있는 칸에
      } else {
        addRow(p.address); // 나머지는 칸을 늘려서
      }
    });

    // 저장 버튼 → localStorage에 저장 후 다음 화면
    this.querySelector("#submit").addEventListener("click", () => {
      const place = [];

      this.querySelectorAll(".formRow input").forEach((input) => {
        const address = input.value.trim();
        if (address !== "") {
          place.push({ name: input.dataset.name, address });
        }
      });

      // 집, 회사는 필수
      const hasHome = place.some((p) => p.name === "집");
      const hasWork = place.some((p) => p.name === "회사");
      if (!hasHome || !hasWork) {
        alert("집과 회사 주소를 입력해주세요.");
        return;
      }

      const user = getStorage("user");
      user.place = place;
      setStorage("user", user);

      this.closest("main-div").render(); // → 위젯 추가 화면
    });
  }
}
class AddWidget extends HTMLElement {
  connectedCallback() {
    //div 가이드 추가 코드
    const noneDiv = document.createElement("div");
    noneDiv.id = "none";
    noneDiv.style.marginTop = "140px";
    noneDiv.style.marginBottom = "70px";
    noneDiv.innerHTML = "원하는 위젯을<br>추가해주세요";

    //widget 스크롤
    const widgetScroll = document.createElement("widget-list");
    widgetScroll.hidden = true;

    noneDiv.addEventListener("click", () => {
      widgetScroll.classList.add("widgetSlideUp");
      widgetScroll.hidden = false;
    });

    const mainPartDiv = document.createElement("div");
    mainPartDiv.id = "mainPart";
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
  render(screen) {
    this.innerHTML = ""; // 이전 화면 비우기
    this.screen = screen; // 지금 보이는 화면 (home 화면이면 아래에서 'home'으로 바뀜)
    const user = getStorage("user");

    // 하단바 + 버튼 → 위젯이 있어도 위젯 추가 화면
    if (screen === "addWidget") {
      const addWidget = document.createElement("add-widget");
      addWidget.setAttribute("open", ""); // 목록을 바로 열기
      this.appendChild(addWidget);
      return;
    }

    // 하단바 리스트 버튼 → 장소 수정 화면
    if (screen === "address") {
      this.appendChild(document.createElement("address-screen"));
      return;
    }

    //첫 시작 => 로그인 창
    if (user.firstStart) {
      this.appendChild(document.createElement("login-screen"));
    }
    //장소, 회사 설정 창
    else if (user.place.length === 0) {
      this.appendChild(document.createElement("address-screen"));
    }
    //위젯 설정 창.
    else if (user.widgetList.length === 0) {
      this.appendChild(document.createElement("add-widget"));
    }
    //메인 home화면 창
    else {
      this.screen = "home";
      document.querySelector("navigation-bar").hidden = false;

      //유저 데이터의 위젯 리스트 가지고 와서 뿌리기.
      const widgetBoard = document.createElement("div");
      widgetBoard.id = "widgetBoard";

      user.widgetList.forEach((el) => {
        const widget = document.createElement(`${el.name}-widget`);
        widget.setAttribute("type", el.type);
        widgetBoard.appendChild(widget);
      });

      this.appendChild(widgetBoard);
    }
  }
}

// 저장된 배열을 기준으로 번호와 불빛을 다시 그림
function renderWidgetOrder() {
  const { widgetList } = getStorage("user");

  document.querySelectorAll(".widgetOrder").forEach((el) => el.remove());
  document
    .querySelectorAll("widget-btn .light")
    .forEach((el) => el.classList.remove("on"));

  widgetList.forEach((widget, index) => {
    const option = document.querySelector(
      `[data-name="${widget.name}"][data-type="${widget.type}"]`,
    );

    const order = document.createElement("div");
    order.className = "widgetOrder";
    order.textContent = index + 1;
    option.appendChild(order);

    option.closest("widget-btn").querySelector(".light").classList.add("on");
  });
}

// 위젯을 눌렀을 때 배열을 바꾸고 localStorage에 저장
function toggleWidget(name, type) {
  const user = getStorage("user");
  const found = user.widgetList.find((widget) => widget.name === name);

  if (!found) {
    user.widgetList.push({ name, type }); // 처음 고른 위젯
  } else if (found.type === type) {
    user.widgetList = user.widgetList.filter((widget) => widget.name !== name); // 같은 크기를 다시 누르면 취소
  } else {
    found.type = type; // 다른 크기를 누르면 번호는 유지하고 크기만 변경
  }

  setStorage("user", user);
  renderWidgetOrder();
}

class WidgetList extends HTMLElement {
  connectedCallback() {
    const widgetList = document.createElement("div");
    widgetList.id = "widgetList";

    for (let i in widgetName) {
      let nav = document.createElement(`widget-btn`);
      nav.id = i;
      widgetList.appendChild(nav);
    }

    //확인 버튼
    const finishDiv = document.createElement("div");
    finishDiv.id = "widgetSubmit";

    finishDiv.addEventListener("click", () => {
      const user = getStorage("user");
      // 고른 위젯이 없으면 넘어가지 않음
      if (user.widgetList.length === 0) return;

      user.firstStart = false;
      setStorage("user", user);

      this.closest("main-div").render();
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

    const vectorImg = this.querySelector(".vectorImg");
    const option = this.querySelector(".widgetOption");
    const wrapper = this.querySelector(".widgetWrapper");

    vectorImg.addEventListener("click", () => {
      const isOpen = option.classList.toggle("show");

      vectorImg.classList.toggle("open", isOpen);
      wrapper.classList.toggle("expanded", isOpen);
    });

    this.querySelectorAll(".smallOption, .bigOption").forEach((option) => {
      option.addEventListener("click", () => {
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

    const ul = this.querySelector("ul"); // ul 태그 선택

    const input = this.querySelector("input"); // input 태그 선택
    const addBtn = this.querySelector("#addBtn");

    const LIMIT_TIME = 24 * 60 * 60 * 1000; // 24시간(시간 분 초 밀리초) -> 밀리초 계산

    // 리스트 띄우기
    function renderList() {
      ul.innerHTML = ""; // ul 태그 초기화
      let list = JSON.parse(localStorage.getItem("list")) || [];
      const now = Date.now(); // 밀리초 현재 시간

      // 완료되지 않은 항목은 유지, 완료한 항목은 완료 후 24시간 미만일 때만 유지
      list = list.filter((item) => {
        // 완료하지 않은 항목은 유지
        if (!item.completed) {
          return true;
        }

        // 완료 시간이 없는 항목도 유지
        if (item.completedTime == null) {
          return true;
        }

        // 완료된 지 24시간 미만이면 유지
        if (now - item.completedTime < LIMIT_TIME) {
          return true;
        }

        // 24시간 이상 지났으면 삭제
        return false;
      });

      localStorage.setItem("list", JSON.stringify(list));

      for (let i = 0; i < list.length; i++) {
        const li = document.createElement("li");
        li.innerHTML = list[i].text;

        if (list[i].completed) li.classList.add("completed");
        li.addEventListener("click", () => completeList(i));

        ul.appendChild(li);
      }
    }

    // 완료한 항목
    function completeList(index) {
      const list = JSON.parse(localStorage.getItem("list")) || [];
      // 완료 ↔ 미완료 전환 (완료하면 완료 시간 기록)
      list[index].completed = !list[index].completed;
      list[index].completedTime = list[index].completed ? Date.now() : null;

      localStorage.setItem("list", JSON.stringify(list));

      renderList();
    }

    // 리스트 추가
    function addList() {
      const input_value = input.value.trim(); // 사용자가 입력한 값

      if (input_value === "") {
        alert("할 일을 입력해주세요");
        return;
      }

      const list = JSON.parse(localStorage.getItem("list")) || [];
      list.push({
        text: input_value, // 사용자가 입력한 값 (string)
        completed: false, // 완료 여부 (boolean)
        completedTime: null, // 완료한 시간 (number)
      });
      localStorage.setItem("list", JSON.stringify(list)); // 배열 -> 문자열 => 저장

      renderList();

      // document.getElementById("input").value = ""; // 입력창 초기화
      input.value = "";
    }

    addBtn.addEventListener("click", addList);
    renderList();
  }
}

// 네비게이션 위젯(틀만 존재)
class NavigationWidget extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `
      <div class="navigationWidget">
        <div class="mapArea">
          <div class="mapBox"></div>
          <div class="routeBox" hidden>
            <select class="routeSort">
              <option value="best">최적 경로순</option>
              <option value="time">최소 시간순</option>
              <option value="transfer">최소 환승순</option>
              <option value="walk">최소 도보순</option>
            </select>
            <div class="routeCards"></div>
          </div>
          <div class="mapMessage" hidden></div>
          <div class="placeList" hidden></div>
        </div>
        <div class="navFooter">
          <div class="navBtns">
            <button type="button" class="navBtn" data-mode="work">
              <img src="./assets/redPing.svg" alt="" />출근
            </button>
            <button type="button" class="navBtn" data-mode="home">
              <img src="./assets/bluePing.svg" alt="" />퇴근
            </button>
          </div>
          <div class="navInfo"></div>
        </div>
      </div>
    `;

    const info = this.querySelector(".navInfo");
    const buttons = this.querySelectorAll(".navBtn");
    const placeList = this.querySelector(".placeList");
    const mapMessage = this.querySelector(".mapMessage");
    const routeBox = this.querySelector(".routeBox");
    const routeSort = this.querySelector(".routeSort");
    const routeCards = this.querySelector(".routeCards");

    let routePaths = null; // 마지막으로 검색한 경로 목록 (대중교통 화면에서 씀)

    // 대중교통 경로 카드 그리기 (큰 위젯 3개, 작은 위젯 1개)
    const renderRoutes = () => {
      routeCards.innerHTML = "";

      if (!routePaths) {
        const empty = document.createElement("div");
        empty.className = "routeEmpty";
        empty.textContent = "출근이나 퇴근 경로를 먼저 골라주세요.";
        routeCards.appendChild(empty);
        return;
      }

      const count = this.getAttribute("type") === "2" ? 3 : 1;
      sortPaths(routePaths, routeSort.value)
        .slice(0, count)
        .forEach((path) => routeCards.appendChild(makeRouteCard(path)));
    };

    routeSort.addEventListener("change", renderRoutes);
    renderRoutes();

    // 지도 위에 안내 문구 띄우기 (빈 문자열이면 숨김)
    const showMessage = (text) => {
      mapMessage.textContent = text;
      mapMessage.hidden = !text;
    };

    // 위젯 선택 화면의 미리보기에서는 API를 부르지 않음 (호출 횟수 절약)
    if (this.closest(".optionBody")) {
      info.textContent = "미리보기";
      return;
    }

    try {
      await loadKakaoMap();
    } catch (err) {
      showMessage(err.message);
      return;
    }

    // 주소를 못 찾아도 지도는 먼저 띄움 (처음엔 서울시청, 경로를 그리면 경로에 맞춰 이동)
    const map = new kakao.maps.Map(this.querySelector(".mapBox"), {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 6,
    });

    const drawn = []; // 지도에 그린 선과 마커 (다시 그릴 때 지우려고 보관)

    // 경로 그리기. work = 집 → 고른 장소, home = 고른 장소 → 집
    const showRoute = async (mode, target) => {
      const { place } = getStorage("user");
      const home = place.find((p) => p.name === "집");

      buttons.forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.mode === mode),
      );

      if (!home) {
        info.textContent = "";
        showMessage("집 주소를 먼저 입력해주세요.");
        return;
      }

      showMessage("");
      info.textContent = "경로를 찾는 중...";

      try {
        const [homeXY, targetXY] = await Promise.all([
          getCoords(home.address),
          getCoords(target.address),
        ]);
        const [start, end] =
          mode === "work" ? [homeXY, targetXY] : [targetXY, homeXY];

        const route = await searchRoute(start, end);
        drawRoute(map, route, start, end, drawn);

        routePaths = route.paths;
        renderRoutes();
        info.textContent = `${target.name} · ${route.info.totalTime}분 · ${route.info.payment.toLocaleString()}원`;
      } catch (err) {
        info.textContent = "";
        showMessage(err.message);
      }
    };

    // 목적지 목록 열기 (집을 뺀 저장된 장소들)
    const openList = (mode) => {
      const { place } = getStorage("user");
      const targets = place.filter((p) => p.name !== "집");

      placeList.innerHTML = "";

      const title = document.createElement("div");
      title.className = "placeListTitle";
      title.textContent =
        mode === "work" ? "어디로 출근할까요?" : "어디서 퇴근할까요?";
      placeList.appendChild(title);

      if (targets.length === 0) {
        const empty = document.createElement("div");
        empty.className = "placeRow";
        empty.textContent = "저장된 장소가 없습니다.";
        placeList.appendChild(empty);
      }

      targets.forEach((target) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "placeRow";

        const name = document.createElement("span");
        name.className = "placeName";
        name.textContent = target.name;

        const address = document.createElement("span");
        address.className = "placeAddress";
        address.textContent = target.address;

        row.append(name, address);

        // 장소를 고르면 목록을 닫고 경로 그리기
        row.addEventListener("click", () => {
          placeList.hidden = true;
          showRoute(mode, target);
        });

        placeList.appendChild(row);
      });

      placeList.dataset.mode = mode;
      placeList.hidden = false;
    };

    buttons.forEach((btn) =>
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;

        // 같은 버튼을 다시 누르면 목록 닫기
        if (!placeList.hidden && placeList.dataset.mode === mode) {
          placeList.hidden = true;
          return;
        }

        openList(mode);
      }),
    );

    // 지도 영역을 꾹 누르면(0.6초) 지도 ↔ 대중교통 경로 목록 전환
    const area = this.querySelector(".mapArea");
    const LONG_PRESS_TIME = 600;
    let pressTimer = null;
    let pressX = 0;
    let pressY = 0;
    let justToggled = false; // 꾹 누른 뒤 손을 뗄 때 생기는 클릭은 무시

    const toggleView = () => {
      if (!placeList.hidden) return; // 목적지 목록이 열려 있으면 전환하지 않음

      routeBox.hidden = !routeBox.hidden;
      if (!routeBox.hidden) renderRoutes(); // 열 때마다 출발·도착 시각을 지금 기준으로
      justToggled = true;
    };

    const cancelPress = () => clearTimeout(pressTimer);

    // capture: true → 카카오맵이 이벤트를 가져가기 전에 먼저 받음
    area.addEventListener(
      "pointerdown",
      (e) => {
        pressX = e.clientX;
        pressY = e.clientY;
        justToggled = false;
        pressTimer = setTimeout(toggleView, LONG_PRESS_TIME);
      },
      true,
    );

    // 지도를 끌고 있으면(10px 넘게 움직이면) 꾹 누르기 취소
    area.addEventListener(
      "pointermove",
      (e) => {
        if (
          Math.abs(e.clientX - pressX) > 10 ||
          Math.abs(e.clientY - pressY) > 10
        ) {
          cancelPress();
        }
      },
      true,
    );

    area.addEventListener("pointerup", cancelPress, true);
    area.addEventListener("pointercancel", cancelPress, true);

    area.addEventListener(
      "click",
      (e) => {
        if (!justToggled) return;
        e.stopPropagation();
        e.preventDefault();
        justToggled = false;
      },
      true,
    );

    // 모바일에서 꾹 누를 때 뜨는 메뉴 막기
    area.addEventListener("contextmenu", (e) => e.preventDefault());

    // 처음에는 회사 경로를 보여줌 (오전이면 출근, 오후면 퇴근)
    const work = getStorage("user").place.find((p) => p.name === "회사");
    if (work) showRoute(new Date().getHours() < 12 ? "work" : "home", work);
  }
}

class TrafficWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <div class="trafficWidget">
    <div id="trafficHeader">
      <div id="widgetTitle">교통정보</div>
      <div id="status"></div>
      <button type="button" class="repeatImg"></button>
    </div>
    <div id="trafficData"></div>

    </div>`;

    const repeatImg = this.querySelector(".repeatImg");

    repeatImg.addEventListener("click", () => {
      // 현재 위치 좌표 변수 선언
      let currentLat = 0;
      let currentLng = 0;

      // 현재 위치를 가져오는 함수
      // function getCurrentPosition() {
      //   return new Promise((resolve, reject) => {
      //     navigator.geolocation.getCurrentPosition(
      //       (position) => {
      //         resolve({
      //           lat: position.coords.latitude,
      //           lng: position.coords.longitude,
      //         });
      //       },
      //       (error) => reject(error),
      //     );
      //   });
      // }

      // 두 지점 간의 거리 계산 함수
      function getDistance(currentLat, currentLng, lat, lng) {
        function degToRad(deg) {
          // 각도(degree) -> 라디안(radian)
          return deg * (Math.PI / 180);
        }

        var R = 6371; // 지구의 평균 반지름 km로
        var dLat = degToRad(lat - currentLat);
        var dLng = degToRad(lng - currentLng);

        // a : 사이 각도
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

      const status = this.querySelector("#status");
      const list = this.querySelector("#trafficData");

      status.textContent = "교통돌발정보를 불러오는 중...";
      list.replaceChildren(); // 새로운 정보로 업데이트, 모든 자식 요소를 제거

      try {
        // const position = await getCurrentPosition();

        // 현재 위치
        // currentLat = position.lat;
        // currentLng = position.lng;

        // 학교 위치 : 현재 위치로 지정해놓음
        currentLat = 37.4661018035835;
        currentLng = 126.931927855676;

        fetch("traffic.xml")
          .then((response) => response.text())

          .then((xmlString) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            const records = [...xmlDoc.querySelectorAll("record")];

            if (records.length === 0) {
              const message = xmlDoc.querySelector("resultMsg")?.textContent;

              status.textContent =
                message ||
                "표시할 돌발정보가 없거나 API 응답을 확인해야 합니다.";

              console.log("UTIC 응답:", xmlString);
              return;
            }

            let count = 0; // 사건 건수 카운트

            //사고 데이터 출력
            for (const record of records) {
              const lat = record.querySelector("locationDataY")?.textContent;
              const lng = record.querySelector("locationDataX")?.textContent;

              let between = getDistance(currentLat, currentLng, lat, lng);

              // ---년 --월 --일  --시 --분
              let startDate =
                record.querySelector("startDate")?.textContent || "";
              let endDate = record.querySelector("endDate")?.textContent || "";

              // 시작 시간이나 종료 시간이 없으면 건너뛰기
              if (!startDate || !endDate) {
                continue;
              }

              // 숫자형태로 바꾸기 (202610190034)
              startDate = Number(startDate.replace(/[^0-9]/g, "")); //
              endDate = Number(endDate.replace(/[^0-9]/g, ""));

              // if (
              //   +between <= 3 &&
              //   startDate <= userDate &&
              //   userDate <= endDate
              // )
              if (between <= 5) {
                const title =
                  record.querySelector("incidentTitle")?.textContent ||
                  "제목 없음";

                const road =
                  record.querySelector("roadName")?.textContent || "";

                const address =
                  record.querySelector("addressNew")?.textContent ||
                  record.querySelector("addressJibun")?.textContent ||
                  "";

                const start =
                  record.querySelector("startDate")?.textContent || "";

                const item = document.createElement("article");
                const heading = document.createElement("h3");
                const detail = document.createElement("p");

                heading.textContent = title;
                detail.textContent = [road, address, start]
                  .filter(Boolean)
                  .join(" · ");

                item.append(heading, detail);
                list.appendChild(item);
                count++;
              }
            }
            status.textContent = `돌발정보 ${count}건을 불러왔습니다.`;
          });
      } catch (error) {
        console.error("API 요청 실패:", error);
        status.textContent = error.message;
      }
    });
  }
}

// 알람 위젯 (type="1" → 500*500, type="2" → 1000*1000)
class AlarmWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="alarmWidget">
        <div class="alarmTop">
          <img class="alarmClock" src="./assets/clock.svg" alt="알람" />
          <div class="alarmTime">
            <div class="ampmText"></div>
            <div class="timeText"></div>
          </div>
        </div>

        <!-- 이 자리에 renderList()가 알람 칸을 넣음 -->
        <button type="button" class="alarmInfo alarmAddBtn">+</button>
      </div>
    `;

    this.renderList();

    const ampmText = this.querySelector(".ampmText");
    const timeText = this.querySelector(".timeText");

    // 현재 시각을 읽어서 화면에 넣는 함수
    const updateClock = () => {
      const now = new Date();
      let hour = now.getHours();
      const min = now.getMinutes();

      ampmText.textContent = hour >= 12 ? "오후" : "오전";

      hour = hour % 12;
      if (hour === 0) hour = 12; // 0시, 12시는 12로 표시

      timeText.textContent = `${pad(hour)}:${pad(min)}`;
    };

    updateClock(); // 처음에 한 번 바로 실행
    this.timer = setInterval(updateClock, 1000); // 1초마다 실시간으로 바꾸기

    // + 버튼 → 모달을 시간 설정 화면으로 열기
    this.querySelector(".alarmAddBtn").addEventListener("click", () => {
      openAlarmModal("setting");
    });
  }

  // 저장된 알람으로 위젯의 알람 칸 다시 그리기 (작은 위젯 1칸, 큰 위젯 3칸)
  renderList() {
    const box = this.querySelector(".alarmWidget");
    const addBtn = this.querySelector(".alarmAddBtn");
    const alarms = loadAlarms();
    const count = this.getAttribute("type") === "2" ? 3 : 1;

    box.querySelectorAll(".alarmRow").forEach((el) => el.remove());

    for (let i = 0; i < count; i++) {
      const row = document.createElement("div");
      row.className = "alarmInfo alarmRow";

      if (alarms[i]) {
        row.textContent = formatAlarmShort(alarms[i].time);
        if (!alarms[i].on) row.classList.add("off"); // 꺼진 알람은 흐리게
      } else if (i === 0) {
        row.textContent = "설정된 알람 없음";
      }

      // 알람 칸 누르면 → 알람 목록 모달
      row.addEventListener("click", () => openAlarmModal());

      box.insertBefore(row, addBtn);
    }
  }

  // 화면이 바뀌어 위젯이 사라지면 시계도 멈춤 (Main.render()가 innerHTML을 비울 때)
  disconnectedCallback() {
    clearInterval(this.timer);
  }
}

//날씨 위젯.
class WeatherWidget extends HTMLElement {
  async connectedCallback() {
    // let type = this.getAttribute('type');

    const getTime = new Date();
    let nowWeather;

    try {
      nowWeather = await getWeather();
    } catch (err) {
      // 실패해도 위젯 칸은 그대로 두고 이유를 표시
      this.innerHTML = `<div id="weather">
          <div class="weatherError">날씨를 불러오지 못했습니다.<br>${err.message}</div>
        </div>`;
      return;
    }

    this.innerHTML = ` <div id="weather">
          <div id="weather_1">
            <div id="type${nowWeather[2]}" class="weatherImg"></div>
            <div class="date">${getTime.getMonth() + 1}월 ${getTime.getDate()}일 ${["일", "월", "화", "수", "목", "금", "토"][getTime.getDay()]}요일</div>
            <div class="time">${pad(getTime.getHours())}:${pad(getTime.getMinutes())}</div>
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
customElements.define("start-screen", StartScreen);
customElements.define("login-screen", Login);
customElements.define("address-screen", AddressScreen);
customElements.define("add-widget", AddWidget);
customElements.define("top-bar", TopBar);
customElements.define("navigation-bar", FootNavigationBar);
customElements.define("navigation-widget", NavigationWidget);
customElements.define("alarm-widget", AlarmWidget);
customElements.define("widget-btn", WidgetBtn);
customElements.define("note-widget", NoteWidget);
customElements.define("traffic-widget", TrafficWidget);
customElements.define("main-div", Main);
customElements.define("weather-widget", WeatherWidget);
customElements.define("widget-list", WidgetList);

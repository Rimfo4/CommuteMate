//알람 관련 로직 모음 (공통 함수, 알람 모달, 알람 울림)
//화면에 보이는 알람 위젯(AlarmWidget)은 날씨 위젯처럼 components.js에 있음
import { getStorage, setStorage } from "./db.js";

//알람 공통 함수
//저장 g형식: user.alarm = [{ time: '07:00', on: true }, { time: '07:40', on: false }, ...]

// 저장된 알람 목록 읽기
function loadAlarms() {
  return getStorage("user").alarm || []; // 예전에 저장된 user에는 alarm이 없을 수 있음
}

// 알람 목록 저장 + 화면의 알람 위젯들도 다시 그리기
function saveAlarms(alarms) {
  const user = getStorage("user");
  user.alarm = alarms;
  setStorage("user", user);

  document
    .querySelectorAll("alarm-widget")
    .forEach((widget) => widget.renderList());
}

// 숫자를 두 자리로 (7 -> "07")
function pad(n) {
  return String(n).padStart(2, "0");
}

// "19:07" -> { ampm: '오후', hour: 7, min: '07' }
function splitAlarmTime(time) {
  const [h, min] = time.split(":");
  let hour = Number(h);
  const ampm = hour >= 12 ? "오후" : "오전";

  hour = hour % 12;
  if (hour === 0) hour = 12; // 0시, 12시는 12로 표시

  return { ampm, hour, min };
}

// 모달 카드용: "19:07" -> "오후 07:07"
function formatAlarm(time) {
  const { ampm, hour, min } = splitAlarmTime(time);
  return `${ampm} ${pad(hour)}:${min}`;
}

// 위젯 칸용: "07:00" -> "오전 7시 00분"
function formatAlarmShort(time) {
  const { ampm, hour, min } = splitAlarmTime(time);
  return `${ampm} ${hour}시 ${min}분`;
}

// 알람 모달 열기 (mode가 'setting'이면 시간 설정 화면부터)
function openAlarmModal(mode) {
  document.querySelector("alarm-modal")?.remove(); // 이미 열려 있으면 닫고 새로 열기

  const modal = document.createElement("alarm-modal");
  if (mode) modal.setAttribute("mode", mode);
  document.body.appendChild(modal);
}

// 알람 모달 (알람 목록 ↔ 시간 설정 화면)
// alarm_basic.html(목록, 토글, 삭제)과 alarm_ setting.html(시간 휠)을 하나로 합친 것
class AlarmModal extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="alarmPanel">
        <div class="alarmPanelTop">
          <img class="alarmPanelClock" src="./assets/clock.svg" alt="알람" />
          <button type="button" class="alarmClose">✕</button>
        </div>
        <div class="alarmPanelBody"></div>
        <div id="tongAlarm"></div>
      </div>
    `;

    this.body = this.querySelector(".alarmPanelBody");

    // X 버튼: 설정 화면이면 목록으로, 목록이면 모달 닫기
    this.querySelector(".alarmClose").addEventListener("click", () => {
      if (this.mode === "setting") this.showList();
      else this.remove();
    });

    if (this.getAttribute("mode") === "setting") this.showSetting();
    else this.showList();
  }

  //알람 목록 화면
  showList() {
    this.mode = "list";
    this.body.innerHTML = "";

    const alarms = loadAlarms();

    if (alarms.length === 0) {
      const empty = document.createElement("div");
      empty.className = "alarmEmpty";
      empty.textContent = "설정된 알람이 없습니다";
      this.body.appendChild(empty);
    }

    alarms.forEach((alarm, index) => {
      const card = document.createElement("div");
      card.className = "alarmCard";
      card.innerHTML = `
        <button type="button" class="alarmCardDelete"></button>
        <div class="alarmCardTime">${formatAlarm(alarm.time)}</div>
        <label class="alarmSwitch">
          <input type="checkbox" ${alarm.on ? "checked" : ""} />
          <span class="alarmSlider"></span>
        </label>
      `;

      // 토글: 누를 때마다 on/off 값을 바꿔서 저장
      const checkbox = card.querySelector("input");
      checkbox.addEventListener("change", () => {
        const list = loadAlarms();
        list[index].on = checkbox.checked;
        saveAlarms(list);
      });

      // 휴지통: 이 알람을 목록에서 빼고 저장
      card.querySelector(".alarmCardDelete").addEventListener("click", () => {
        const list = loadAlarms();
        list.splice(index, 1);
        saveAlarms(list);
        this.showList();
      });

      this.body.appendChild(card);
    });

    // + 버튼 → 시간 설정 화면
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "alarmPlus";
    plus.textContent = "+";
    plus.addEventListener("click", () => this.showSetting());
    this.body.appendChild(plus);
  }

  // ===== 시간 설정 화면 (alarm_ setting.html) =====
  showSetting() {
    this.mode = "setting";
    this.body.innerHTML = `
      <div class="alarmPicker">
        <div class="alarmWheels">
          <div class="alarmSelectLine"></div>
          <div class="alarmWheel ampm"></div>
          <div class="alarmWheel hour"></div>
          <div class="alarmColon">:</div>
          <div class="alarmWheel min"></div>
        </div>
        <button type="button" class="alarmOk">확인</button>
      </div>
    `;

    const ITEM_H = 150; // 한 줄 높이 (CSS의 .alarmItem height와 같아야 함)

    const ampmWheel = this.body.querySelector(".ampm");
    const hourWheel = this.body.querySelector(".hour");
    const minWheel = this.body.querySelector(".min");

    // 휠에 들어갈 값 목록
    const ampmList = ["오전", "오후"];
    const hourList = [
      "12",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
    ];
    const minList = [];
    for (let i = 0; i < 60; i++) minList.push(pad(i));

    // 무한 반복용: 목록을 몇 번 이어 붙일지
    const hourCopies = 25; // 12 x 25 = 300줄
    const minCopies = 5; // 60 x 5 = 300줄

    // 지금 가운데에 있는 줄이 몇 번째인지 (0부터)
    const getIndex = (wheel) => Math.round(wheel.scrollTop / ITEM_H);

    // 몇 번째 줄이 가운데 오게 이동
    const setIndex = (wheel, i) => {
      wheel.scrollTop = i * ITEM_H;
    };

    // 반복되는 휠에서 지금 선택된 값이 목록의 몇 번째인지
    const getValue = (wheel, list) => getIndex(wheel) % list.length;

    // 반복되는 휠을 가운데 복사본의 value번째 값으로 맞추기
    const setValue = (wheel, list, copies, value) => {
      setIndex(wheel, Math.floor(copies / 2) * list.length + value);
    };

    // 목록을 copies번 반복해서 휠 안에 한 줄씩 넣기
    const fillWheel = (wheel, list, copies) => {
      for (let c = 0; c < copies; c++) {
        list.forEach((text, i) => {
          const itemIndex = c * list.length + i;
          const item = document.createElement("div");
          item.className = "alarmItem";
          item.textContent = text;

          // 줄을 누르면 그 줄이 가운데로 오게 이동
          item.addEventListener("click", () => {
            wheel.scrollTo({ top: itemIndex * ITEM_H, behavior: "smooth" });
          });

          wheel.appendChild(item);
        });
      }
    };

    // 휠이 멈추면 같은 값의 가운데 복사본으로 몰래 옮겨서 끝없이 돌게 하기
    const loopWheel = (wheel, list, copies) => {
      let timer;
      wheel.addEventListener("scroll", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const middle =
            Math.floor(copies / 2) * list.length + getValue(wheel, list);
          if (getIndex(wheel) !== middle) setIndex(wheel, middle);
        }, 150);
      });
    };

    // 휠 3개의 위치를 읽어서 "HH:MM"(24시간) 형식으로 만들기
    const getTime = () => {
      const isPm = getIndex(ampmWheel) === 1;
      let hour24 = getValue(hourWheel, hourList) % 12; // 12시는 0으로
      if (isPm) hour24 += 12;
      return `${pad(hour24)}:${pad(getValue(minWheel, minList))}`;
    };

    // 1. 휠 채우기
    fillWheel(ampmWheel, ampmList, 1);
    fillWheel(hourWheel, hourList, hourCopies);
    fillWheel(minWheel, minList, minCopies);

    // 2. 시, 분 휠은 무한 반복
    loopWheel(hourWheel, hourList, hourCopies);
    loopWheel(minWheel, minList, minCopies);

    // 3. 처음에는 현재 시간으로 맞추기
    const now = new Date();
    setIndex(ampmWheel, now.getHours() >= 12 ? 1 : 0);
    setValue(hourWheel, hourList, hourCopies, now.getHours() % 12);
    setValue(minWheel, minList, minCopies, now.getMinutes());

    // 4. 확인 버튼 → 새 알람(켜진 상태)을 저장하고 목록으로
    this.body.querySelector(".alarmOk").addEventListener("click", () => {
      const alarms = loadAlarms();
      alarms.push({ time: getTime(), on: true });

      // 시간 순서대로 정렬 ("07:00" < "07:40" 글자 순서가 곧 시간 순서)
      alarms.sort((a, b) => a.time.localeCompare(b.time));

      saveAlarms(alarms);
      this.showList();
    });
  }
}

//알람 울리기
// 브라우저가 사용자가 화면을 누르기 전까지 소리를 못 내게 막아버림.
// 그래서 화면을 처음 누를 때 알람 음악을 소리 없이 한 번 재생했다 멈춰서 미리 풀어 둠.
const alarmSound = new Audio("./assets/sounds/Hillside.mp3");
alarmSound.loop = true; // 끄기 누를 때까지 반복
let soundUnlocked = false;

function unlockAudio() {
  // 알람이 울리는 중인데 소리가 막혀 있었다면 → 지금 누른 순간 바로 재생
  if (document.querySelector("alarm-ring")) {
    alarmSound.play().catch(() => {});
    return;
  }

  if (soundUnlocked) return;

  alarmSound.muted = true;
  alarmSound
    .play()
    .then(() => {
      alarmSound.pause();
      alarmSound.currentTime = 0;
      soundUnlocked = true;
    })
    .catch(() => {})
    .finally(() => {
      alarmSound.muted = false;
    });
}

// 화면을 누르거나 키를 누를 때 소리 제한 풀기
// (울림 창이 떴을 때 아직 소리가 안 나도, 화면을 한 번 누르면 그때부터 소리가 남)
document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("keydown", unlockAudio);

// 1초마다 지금 시각과 켜진 알람의 시간을 비교해서, 같으면 울림 창을 띄움
let lastRingKey = ""; // 같은 1분 동안 여러 번 울리지 않게 마지막으로 울린 날짜+시간을 기억

function checkAlarm() {
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const key = `${now.toDateString()} ${time}`;

  if (key === lastRingKey) return; // 이번 1분에 이미 울림
  if (document.querySelector("alarm-ring")) return; // 이미 울리는 중

  const alarm = loadAlarms().find((a) => a.on && a.time === time);
  if (!alarm) return;

  lastRingKey = key;

  const ring = document.createElement("alarm-ring");
  ring.setAttribute("time", time);
  document.body.appendChild(ring);
}

// 알람 울림 창 (끄기 누를 때까지 소리 반복)
class AlarmRing extends HTMLElement {
  connectedCallback() {
    const { ampm, hour, min } = splitAlarmTime(this.getAttribute("time"));

    this.innerHTML = `
      <div class="alarmRingBox">
        <img class="alarmRingClock" src="./assets/clock.svg" alt="알람" />
        <div class="alarmRingAmpm">${ampm}</div>
        <div class="alarmRingTime">${pad(hour)} : ${min}</div>
        <button type="button" class="alarmRingOff">끄기</button>
      </div>
    `;

    this.querySelector(".alarmRingOff").addEventListener("click", () => {
      this.remove();
      console.log("삭제 성공");
      alarm.off;
    });

    this.startSound();
  }

  // 알람 음악을 처음부터 반복 재생 (막혀 있으면 화면을 누를 때 unlockAudio가 재생)
  startSound() {
    alarmSound.muted = false;
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => {});

    navigator.vibrate?.([500, 500, 500]); // 진동이 되는 기기면 진동도
  }

  // 끄기를 누르면(창이 사라지면) 음악도 멈추고 처음으로 되돌림
  disconnectedCallback() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
  }
}

customElements.define("alarm-modal", AlarmModal);
customElements.define("alarm-ring", AlarmRing);

// 알람 시간 확인 시작 (페이지가 열려 있는 동안 1초마다)
setInterval(checkAlarm, 1000);

// components.js의 AlarmWidget에서 쓰는 함수들
export { loadAlarms, pad, formatAlarmShort, openAlarmModal };

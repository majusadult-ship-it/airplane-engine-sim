const state = { running: false, throttle: 35, mixture: 70, airspeed: 120, rpm: 0, oilPressure: 0, oilTemp: 20, cht: 20 };
const $ = (id) => document.getElementById(id);
const controls = { throttle: $('throttle'), mixture: $('mixture'), airspeed: $('airspeed') };
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
let previousTime = performance.now();

function updateControls() {
  state.throttle = Number(controls.throttle.value);
  state.mixture = Number(controls.mixture.value);
  state.airspeed = Number(controls.airspeed.value);
  $('throttle-output').value = `${state.throttle}%`;
  $('mixture-output').value = `${state.mixture}%`;
  $('airspeed-output').value = `${state.airspeed} kt`;
}

function render() {
  const rpm = Math.round(state.rpm);
  const power = state.running ? clamp((state.rpm / 2700) * (0.45 + state.throttle / 100) * 100, 0, 100) : 0;
  const fuel = state.running ? (2 + state.throttle * 0.13) * (0.65 + state.mixture / 200) : 0;
  $('rpm').textContent = rpm.toLocaleString();
  $('power').textContent = Math.round(power);
  $('fuel').textContent = fuel.toFixed(1);
  $('oil-pressure').textContent = Math.round(state.oilPressure);
  $('oil-temp').textContent = Math.round(state.oilTemp);
  $('cht').textContent = Math.round(state.cht);
  $('needle').style.transform = `translate(-50%,-100%) rotate(${-135 + clamp(state.rpm / 2700, 0, 1) * 270}deg)`;
  $('power-bar').style.width = `${power}%`;
  $('fuel-bar').style.width = `${clamp(fuel / 18 * 100, 0, 100)}%`;
  $('oil-pressure-marker').style.left = `${clamp(state.oilPressure / 80 * 100, 0, 100)}%`;
  $('oil-temp-marker').style.left = `${clamp(state.oilTemp / 260 * 100, 0, 100)}%`;
  $('cht-marker').style.left = `${clamp(state.cht / 320 * 100, 0, 100)}%`;

  const status = $('status');
  let label = state.running ? 'Running · cruise' : 'Engine off';
  let warning = false;
  if (state.running && state.rpm < 650) label = 'Starting…';
  if (state.running && state.oilPressure < 20 && state.rpm > 500) { label = 'Low oil pressure'; warning = true; }
  if (state.running && (state.cht > 250 || state.oilTemp > 220)) { label = 'High temperature'; warning = true; }
  if (state.running && state.throttle > 85 && !warning) label = 'High power';
  if (state.running && state.throttle < 15 && !warning) label = 'Idle';
  status.classList.toggle('running', state.running && !warning);
  status.classList.toggle('warning', warning);
  status.querySelector('span').textContent = label;
}

function simulate(time) {
  const dt = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  const targetRpm = state.running ? 650 + state.throttle * 20 : 0;
  state.rpm += (targetRpm - state.rpm) * Math.min(1, dt * (state.running ? 2.8 : 3.5));
  if (!state.running && state.rpm < 2) state.rpm = 0;
  const cooling = 0.35 + state.airspeed / 200;
  if (state.running) {
    state.oilPressure += (clamp(22 + state.rpm * 0.014, 0, 65) - state.oilPressure) * Math.min(1, dt * 2.5);
    state.oilTemp = clamp(state.oilTemp + (state.throttle * 0.035 - cooling * 1.15) * dt, 20, 260);
    state.cht = clamp(state.cht + (state.throttle * 0.08 - cooling * 2.7 + (100 - state.mixture) * 0.006) * dt, 20, 320);
  } else {
    state.oilPressure = Math.max(0, state.oilPressure - dt * 30);
    state.oilTemp = Math.max(20, state.oilTemp - dt * 1.2);
    state.cht = Math.max(20, state.cht - dt * 2.5);
  }
  render();
  requestAnimationFrame(simulate);
}

$('engine-toggle').addEventListener('click', () => {
  state.running = !state.running;
  const button = $('engine-toggle');
  button.textContent = state.running ? 'Stop engine' : 'Start engine';
  button.classList.toggle('running', state.running);
  button.setAttribute('aria-pressed', String(state.running));
});
Object.values(controls).forEach((control) => control.addEventListener('input', updateControls));
updateControls();
render();
requestAnimationFrame(simulate);

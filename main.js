/**
 * Direct GPU Canvas-to-Texture Component & Simulation Physics
 */

// 1. Native Canvas Texture Bridge for A-Frame
AFRAME.registerComponent('canvas-monitor', {
  schema: {
    canvasId: { type: 'string', default: '' }
  },
  init: function () {
    this.canvas = document.getElementById(this.data.canvasId);
    if (!this.canvas) return;

    // Create persistent Three.js CanvasTexture
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide
    });

    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.material = material;
    } else {
      this.el.addEventListener('model-loaded', () => {
        this.el.getObject3D('mesh').material = material;
      });
    }
  },
  updateTexture: function () {
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
});

// Semiconductor Laser Physics Constants
const I_TH = 25.0; // 25 mA threshold
const SLOPE_EFF = 0.42; // mW/mA
const SPONT_EFF = 0.007; // Sub-threshold efficiency
const PEAK_NM = 650; // Central wavelength (nm)

let current_mA = 0.0;
const dataCurrents = [0];
const dataPowers = [0];

function calculatePower(I) {
  if (I <= 0) return 0;
  if (I <= I_TH) {
    return I * SPONT_EFF;
  } else {
    return (I_TH * SPONT_EFF) + (I - I_TH) * SLOPE_EFF;
  }
}

function calculateSpectrum(I) {
  const points = [];
  const p = calculatePower(I);
  const fwhm = (I < I_TH) ? (35 - (I / I_TH) * 10) : Math.max(0.6, 25 / Math.pow(I / I_TH, 2.5));

  for (let l = 600; l <= 700; l += 2) {
    let intensity = 0;
    if (p > 0) {
      intensity = Math.exp(-Math.pow(l - PEAK_NM, 2) / (2 * Math.pow(fwhm / 2.355, 2))) * p;
    }
    points.push({ lambda: l, val: intensity });
  }
  return { points, fwhm };
}

// Draw Real-time L-I Curve Monitor
function drawLIChart() {
  const canvas = document.getElementById('liChartCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('L-I Characteristic (Power vs Current)', 24, 32);

  const padL = 55, padR = 25, padT = 55, padB = 45;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padT + (plotH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(${20 - i * 4} mW, 10, y + 4);
  }

  for (let i = 0; i <= 6; i++) {
    const x = padL + (plotW / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, h - padB);
    ctx.stroke();
    ctx.fillText(${i * 10}, x - 8, h - padB + 20);
  }
  ctx.fillText('Current I (mA)', w / 2 - 35, h - 8);

  // Plot Line
  if (dataCurrents.length > 0) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < dataCurrents.length; i++) {
      const px = padL + (dataCurrents[i] / 60) * plotW;
      const py = (h - padB) - (dataPowers[i] / 20) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const lastX = padL + (current_mA / 60) * plotW;
    const lastY = (h - padB) - (calculatePower(current_mA) / 20) * plotH;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw Real-time Spectrum Monitor
function drawSpectrumChart(spec) {
  const canvas = document.getElementById('specChartCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(Optical Spectrum (FWHM: ${spec.fwhm.toFixed(1)} nm), 24, 32);

  const padL = 50, padR = 25, padT = 55, padB = 45;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, plotW, plotH);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  for (let l = 600; l <= 700; l += 25) {
    const x = padL + ((l - 600) / 100) * plotW;
    ctx.fillText(${l}, x - 12, h - padB + 20);
  }
  ctx.fillText('Wavelength (nm)', w / 2 - 40, h - 8);

  ctx.beginPath();
  ctx.moveTo(padL, h - padB);
  spec.points.forEach((pt) => {
    const x = padL + ((pt.lambda - 600) / 100) * plotW;
    const y = (h - padB) - (Math.min(20, pt.val) / 20) * plotH;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w - padR, h - padB);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// Draw ANSI Standard Laser Radiation Danger Sign
function drawDangerSign() {
  const canvas = document.getElementById('dangerSignCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(6, 6, w - 12, h - 12);

  // Red DANGER header
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(14, 14, w - 28, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DANGER', w / 2, 56);

  // Laser Starburst Symbol
  ctx.save();
  ctx.translate(w / 2, 125);
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2, -22, 4, 44);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();
  ctx.restore();

  // Warnings
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('LASER RADIATION', w / 2, 185);
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('AVOID DIRECT EYE EXPOSURE', w / 2, 212);

  // Specs
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 235, w - 32, 65);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('• EMISSION: SEMICONDUCTOR LASER DIODE', 28, 258);
  ctx.fillText('• WAVELENGTH: 650 nm | Pmax: 20 mW', 28, 276);
  ctx.fillText('• CLASSIFICATION: CLASS 3B PRODUCT', 28, 292);
}

// Draw Theory & Status Panel
function drawTheoryHUD(p, spec) {
  const canvas = document.getElementById('theoryCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LASER DIODE CHARACTERIZATION', 25, 46);

  // Theory Box
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 90, w - 40, 310);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('1. Light-Current (L-I) Physics', 35, 125);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText('• Sub-threshold (I < 25mA): Spontaneous emission (LED mode).', 35, 155);
  ctx.fillText('• Threshold Current (Ith = 25mA): Optical gain balances cavity loss.', 35, 182);
  ctx.fillText('• Lasing Mode (I >= Ith): Stimulated emission creates steep linear slope.', 35, 209);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('2. Spectral Linewidth Narrowing', 35, 250);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText('• Spontaneous spectrum is broad (FWHM ~ 35 nm) due to thermal spread.', 35, 280);
  ctx.fillText('• At threshold, resonant cavity modes amplify, collapsing spectral width', 35, 307);
  ctx.fillText('  into an intense coherent peak (< 1 nm).', 35, 332);
  // Live Observation Box
  const isLasing = current_mA >= I_TH;
  ctx.fillStyle = isLasing ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.1)';
  ctx.fillRect(20, 420, w - 40, 320);

  ctx.strokeStyle = isLasing ? '#22c55e' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 420, w - 40, 320);

  ctx.fillStyle = isLasing ? '#22c55e' : '#38bdf8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('LIVE EXPERIMENTAL OBSERVATION', 35, 458);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  const stateText = current_mA <= 0 ? 'SYSTEM OFF / IDLE' : (isLasing ? 'STIMULATED EMISSION (LASING ACTIVE)' : 'SPONTANEOUS EMISSION (LED MODE)');
  ctx.fillText(OPERATING STATE: ${stateText}, 35, 495);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px monospace';
  ctx.fillText(• Drive Current (I)      : ${current_mA.toFixed(1)} mA, 35, 540);
  ctx.fillText(• Threshold Current (Ith): 25.0 mA, 35, 570);
  ctx.fillText(• Measured Power (P)     : ${p.toFixed(3)} mW, 35, 600);
  ctx.fillText(• Spectral FWHM          : ${spec.fwhm.toFixed(2)} nm, 35, 630);

  ctx.fillStyle = isLasing ? '#86efac' : '#fde047';
  ctx.font = 'italic 15px sans-serif';
  const tipText = isLasing ? '-> Population inversion achieved! Resonator is lasing.' : '-> Sub-threshold. Increase current above 25 mA to observe lasing.';
  ctx.fillText(tipText, 35, 685);
}

// Push Canvas Updates to GPU
function pushGPUTextureUpdates() {
  ['#li-screen', '#spec-screen', '#danger-sign-mesh', '#theory-mesh'].forEach((id) => {
    const el = document.querySelector(id);
    if (el && el.components && el.components['canvas-monitor']) {
      el.components['canvas-monitor'].updateTexture();
    }
  });
}

function updateSimulation() {
  const p = calculatePower(current_mA);
  const spec = calculateSpectrum(current_mA);

  // LCD on Driver unit
  const lcd = document.querySelector('#lcd-display');
  if (lcd) lcd.setAttribute('value', I: ${current_mA.toFixed(1)} mA\nP: ${p.toFixed(2)} mW);

  // Active Laser Beam
  const beam = document.querySelector('#laser-beam');
  if (beam) {
    if (current_mA <= 0) {
      beam.setAttribute('material', 'opacity', 0.0);
    } else if (current_mA < I_TH) {
      beam.setAttribute('radius', 0.007);
      beam.setAttribute('material', 'opacity', 0.18);
      beam.setAttribute('color', '#f87171');
    } else {
      beam.setAttribute('radius', 0.0032);
      const intensity = Math.min(1.0, 0.45 + (current_mA - I_TH) * 0.035);
      beam.setAttribute('material', 'opacity', intensity);
      beam.setAttribute('color', '#ff0000');
    }
  }

  // Record data
  if (!dataCurrents.includes(current_mA)) {
    dataCurrents.push(current_mA);
    dataPowers.push(p);
    const pairs = dataCurrents.map((c, i) => ({ c, p: dataPowers[i] })).sort((a, b) => a.c - b.c);
    dataCurrents.length = 0;
    dataPowers.length = 0;
    pairs.forEach(item => {
      dataCurrents.push(item.c);
      dataPowers.push(item.p);
    });
  }

  // Draw Canvases
  drawLIChart();
  drawSpectrumChart(spec);
  drawDangerSign();
  drawTheoryHUD(p, spec);

  pushGPUTextureUpdates();
}

// VR Headset Thumbstick Locomotion
AFRAME.registerComponent('vr-locomotion', {
  init: function () {
    this.speed = 0.045;
    this.turnSpeed = 0.035;
  },
  tick: function () {
    const scene = this.el.sceneEl;
    if (!scene.is('vr-mode')) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp  !gp.axes  gp.axes.length < 2) continue;

      const axisX = gp.axes[2] !== undefined ? gp.axes[2] : gp.axes[0];
      const axisY = gp.axes[3] !== undefined ? gp.axes[3] : gp.axes[1];

      // Left Thumbstick -> Walk
      if (gp.hand === 'left' || i === 0) {
        if (Math.abs(axisX) > 0.15 || Math.abs(axisY) > 0.15) {
          const camera = document.querySelector('#camera').object3D;
          const rig = this.el.object3D;
          const angle = camera.rotation.y;
          rig.position.x += (axisX * Math.cos(angle) + axisY * Math.sin(angle)) * this.speed;
          rig.position.z += (-axisX * Math.sin(angle) + axisY * Math.cos(angle)) * this.speed;
        }
      }

      // Right Thumbstick -> Turn
      if (gp.hand === 'right' || i === 1) {
        if (Math.abs(axisX) > 0.2) {
          this.el.object3D.rotation.y -= axisX * this.turnSpeed;
        }
      }
    }
  }
});

// Setup click events
window.addEventListener('DOMContentLoaded', () => {
  // Initial draw
  drawDangerSign();
  updateSimulation();

  // Retry texture sync after 500ms to guarantee initial frame upload
  setTimeout(() => {
    updateSimulation();
  }, 500);

  document.querySelector('#btn-increase').addEventListener('click', () => {
    if (current_mA < 60) {
      current_mA += 5;
      updateSimulation();
    }
  });

  document.querySelector('#btn-step-fine').addEventListener('click', () => {
    if (current_mA < 60) {
      current_mA += 1;
      updateSimulation();
    }
  });

  document.querySelector('#btn-decrease').addEventListener('click', () => {
    if (current_mA >= 1) {
      current_mA = Math.max(0, current_mA - (current_mA >= 5 ? 5 : 1));
      updateSimulation();
    }
  });

  document.querySelector('#btn-reset').addEventListener('click', () => {
    current_mA = 0;
    dataCurrents.length = 0;
    dataPowers.length = 0;
    dataCurrents.push(0);
    dataPowers.push(0);
    updateSimulation();
  });
});





/**
 * Standalone Photonics Physics Engine & Canvas Renderer
 * Laser Diode L-I and Spectral Profile Characterization
 */

// Semiconductor Physics Parameters (AlGaAs/InGaAsP model)
const I_TH = 25.0; // Threshold current: 25.0 mA
const SLOPE_EFF = 0.42; // Slope Efficiency (mW/mA)
const SPONT_EFF = 0.007; // Spontaneous efficiency below Ith
const PEAK_NM = 650; // Central wavelength (nm)

let current_mA = 0.0;
const dataCurrents = [0];
const dataPowers = [0];

// 1. Calculate Optical Power Output
function calculatePower(I) {
  if (I <= 0) return 0;
  if (I <= I_TH) {
    return I * SPONT_EFF;
  } else {
    return (I_TH * SPONT_EFF) + (I - I_TH) * SLOPE_EFF;
  }
}

// 2. Calculate Optical Spectrum
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

// 3. Draw Real-time L-I Curve on Canvas (No External Library Crashes)
function drawLIChart() {
  const canvas = document.getElementById('liChartCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('L-I Characteristic (Power vs Current)', 24, 32);

  // Axes grid
  const padL = 50, padR = 25, padT = 55, padB = 45;
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

    // Y labels (Power 0 to 20 mW)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(${20 - i * 4} mW, 10, y + 4);
  }

  // X labels (Current 0 to 60 mA)
  for (let i = 0; i <= 6; i++) {
    const x = padL + (plotW / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, h - padB);
    ctx.stroke();
    ctx.fillText(${i * 10}, x - 8, h - padB + 20);
  }
  ctx.fillText('Current I (mA)', w / 2 - 35, h - 8);

  // Plot Curve
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

    // Draw active point
    const lastX = padL + (current_mA / 60) * plotW;
    const lastY = (h - padB) - (calculatePower(current_mA) / 20) * plotH;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 4. Draw Real-time Spectrum on Canvas
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

  // Grid
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, plotW, plotH);

  // Wavelength labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  for (let l = 600; l <= 700; l += 25) {
    const x = padL + ((l - 600) / 100) * plotW;
    ctx.fillText(${l}, x - 12, h - padB + 20);
  }
  ctx.fillText('Wavelength (nm)', w / 2 - 40, h - 8);
  // Plot Spectral Intensity
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

// 5. Draw ANSI Standard Real Laser Radiation Danger Sign
function drawDangerSign() {
  const canvas = document.getElementById('dangerSignCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Outer Border & Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(8, 8, w - 16, h - 16);

  // Top Red DANGER Header
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(16, 16, w - 32, 70, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DANGER', w / 2, 65);

  // Laser Burst Symbol (ANSI Starburst)
  ctx.save();
  ctx.translate(w / 2, 140);
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2, -26, 4, 52);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();
  ctx.restore();

  // Text warnings
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('LASER RADIATION', w / 2, 205);
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('AVOID DIRECT EYE EXPOSURE', w / 2, 235);

  // Specification panel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 260, w - 40, 75);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('• EMISSION: SEMICONDUCTOR LASER DIODE', 32, 285);
  ctx.fillText('• WAVELENGTH: 650 nm (RED) | Pmax: 20 mW', 32, 305);
  ctx.fillText('• CLASSIFICATION: CLASS 3B PRODUCT', 32, 325);
}

// 6. Draw Crisp High-Resolution Theory & Live Observation Panel
function drawTheoryHUD(p, spec) {
  const canvas = document.getElementById('theoryCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Background Slate Card
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Header Bar
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, w, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('LASER DIODE CHARACTERIZATION', 30, 52);

  // Section 1: Theory Box
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 100, w - 40, 370);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('1. Light-Current (L-I) Physics', 40, 138);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px sans-serif';
  ctx.fillText('• Sub-threshold (I < 25mA): Spontaneous emission dominates (LED mode).', 40, 175);
  ctx.fillText('• Threshold Current (Ith = 25mA): Optical gain equals total cavity losses.', 40, 205);
  ctx.fillText('• Lasing Mode (I >= Ith): Stimulated emission creates steep linear slope (dP/dI).', 40, 235);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('2. Spectral Linewidth Narrowing', 40, 285);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px sans-serif';
  ctx.fillText('• Spontaneous profile is broad (FWHM ~ 35 nm) due to thermal dispersion.', 40, 322);
  ctx.fillText('• At threshold, resonant cavity modes amplify coherently, collapsing the', 40, 352);
  ctx.fillText('  spectral width into a razor-sharp coherent peak (< 1 nm).', 40, 380);

  // Section 2: Live Status & Observation Box
  const isLasing = current_mA >= I_TH;
  ctx.fillStyle = isLasing ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.1)';
  ctx.fillRect(20, 490, w - 40, 340);

  ctx.strokeStyle = isLasing ? '#22c55e' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 490, w - 40, 340);
  ctx.fillStyle = isLasing ? '#22c55e' : '#38bdf8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('LIVE EXPERIMENTAL OBSERVATION', 40, 535);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px sans-serif';
  const stateText = current_mA <= 0 ? 'SYSTEM OFF / IDLE' : (isLasing ? 'STIMULATED EMISSION (LASING ACTIVE)' : 'SPONTANEOUS EMISSION (LED MODE)');
  ctx.fillText(OPERATING STATE: ${stateText}, 40, 575);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '17px monospace';
  ctx.fillText(• Drive Current (I)      : ${current_mA.toFixed(1)} mA, 40, 620);
  ctx.fillText(• Threshold Current (Ith): 25.0 mA, 40, 652);
  ctx.fillText(• Measured Power (P)     : ${p.toFixed(3)} mW, 40, 684);
  ctx.fillText(• Spectral FWHM          : ${spec.fwhm.toFixed(2)} nm, 40, 716);

  ctx.fillStyle = isLasing ? '#86efac' : '#fde047';
  ctx.font = 'italic 16px sans-serif';
  const tipText = isLasing ? '-> Population inversion achieved! Resonator is lasing.' : '-> Current is below threshold. Increase above 25 mA to observe lasing.';
  ctx.fillText(tipText, 40, 770);
}

// 7. Update Material Maps in A-Frame 3D World
function update3DTextures() {
  const screens = ['#li-screen', '#spec-screen', '#danger-sign-mesh', '#theory-mesh'];
  screens.forEach((id) => {
    const el = document.querySelector(id);
    if (el && el.getObject3D('mesh')) {
      const mat = el.getObject3D('mesh').material;
      if (mat && mat.map) mat.map.needsUpdate = true;
    }
  });
}

// 8. Update Whole Simulation
function updateSimulation() {
  const p = calculatePower(current_mA);
  const spec = calculateSpectrum(current_mA);

  // LCD Text on Driver
  const lcd = document.querySelector('#lcd-display');
  if (lcd) lcd.setAttribute('value', I: ${current_mA.toFixed(1)} mA\nP: ${p.toFixed(2)} mW);

  // Physical Red Laser Beam Intensity
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

  // Record data point
  if (!dataCurrents.includes(current_mA)) {
    dataCurrents.push(current_mA);
    dataPowers.push(p);
    // Sort points
    const combined = dataCurrents.map((c, i) => ({ c, p: dataPowers[i] })).sort((a, b) => a.c - b.c);
    dataCurrents.length = 0;
    dataPowers.length = 0;
    combined.forEach(item => {
      dataCurrents.push(item.c);
      dataPowers.push(item.p);
    });
  }

  // Redraw All 2D Textures
  drawLIChart();
  drawSpectrumChart(spec);
  drawDangerSign();
  drawTheoryHUD(p, spec);

  update3DTextures();
}

// 9. Native VR Headset Thumbstick Locomotion Component
AFRAME.registerComponent('vr-locomotion', {
  init: function () {
    this.speed = 0.04;
    this.turnSpeed = 0.03;
  },
  tick: function () {
    const scene = this.el.sceneEl;
    if (!scene.is('vr-mode')) return;

    // Read VR Gamepads directly
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp  !gp.axes  gp.axes.length < 2) continue;

      const axisX = gp.axes[2] !== undefined ? gp.axes[2] : gp.axes[0];
      const axisY = gp.axes[3] !== undefined ? gp.axes[3] : gp.axes[1];

      // Left Stick (Movement)
      if (gp.hand === 'left' || i === 0) {
        if (Math.abs(axisX) > 0.15 || Math.abs(axisY) > 0.15) {
          const camera = document.querySelector('#camera').object3D;
          const rig = this.el.object3D;
          ctx.fillStyle = isLasing ? '#22c55e' : '#38bdf8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('LIVE EXPERIMENTAL OBSERVATION', 40, 535);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px sans-serif';
  const stateText = current_mA <= 0 ? 'SYSTEM OFF / IDLE' : (isLasing ? 'STIMULATED EMISSION (LASING ACTIVE)' : 'SPONTANEOUS EMISSION (LED MODE)');
  ctx.fillText(OPERATING STATE: ${stateText}, 40, 575);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '17px monospace';
  ctx.fillText(• Drive Current (I)      : ${current_mA.toFixed(1)} mA, 40, 620);
  ctx.fillText(• Threshold Current (Ith): 25.0 mA, 40, 652);
  ctx.fillText(• Measured Power (P)     : ${p.toFixed(3)} mW, 40, 684);
  ctx.fillText(• Spectral FWHM          : ${spec.fwhm.toFixed(2)} nm, 40, 716);

  ctx.fillStyle = isLasing ? '#86efac' : '#fde047';
  ctx.font = 'italic 16px sans-serif';
  const tipText = isLasing ? '-> Population inversion achieved! Resonator is lasing.' : '-> Current is below threshold. Increase above 25 mA to observe lasing.';
  ctx.fillText(tipText, 40, 770);
}

// 7. Update Material Maps in A-Frame 3D World
function update3DTextures() {
  const screens = ['#li-screen', '#spec-screen', '#danger-sign-mesh', '#theory-mesh'];
  screens.forEach((id) => {
    const el = document.querySelector(id);
    if (el && el.getObject3D('mesh')) {
      const mat = el.getObject3D('mesh').material;
      if (mat && mat.map) mat.map.needsUpdate = true;
    }
  });
}

// 8. Update Whole Simulation
function updateSimulation() {
  const p = calculatePower(current_mA);
  const spec = calculateSpectrum(current_mA);

  // LCD Text on Driver
  const lcd = document.querySelector('#lcd-display');
  if (lcd) lcd.setAttribute('value', I: ${current_mA.toFixed(1)} mA\nP: ${p.toFixed(2)} mW);

  // Physical Red Laser Beam Intensity
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

  // Record data point
  if (!dataCurrents.includes(current_mA)) {
    dataCurrents.push(current_mA);
    dataPowers.push(p);
    // Sort points
    const combined = dataCurrents.map((c, i) => ({ c, p: dataPowers[i] })).sort((a, b) => a.c - b.c);
    dataCurrents.length = 0;
    dataPowers.length = 0;
    combined.forEach(item => {
      dataCurrents.push(item.c);
      dataPowers.push(item.p);
    });
  }

  // Redraw All 2D Textures
  drawLIChart();
  drawSpectrumChart(spec);
  drawDangerSign();
  drawTheoryHUD(p, spec);

  update3DTextures();
}

// 9. Native VR Headset Thumbstick Locomotion Component
AFRAME.registerComponent('vr-locomotion', {
  init: function () {
    this.speed = 0.04;
    this.turnSpeed = 0.03;
  },
  tick: function () {
    const scene = this.el.sceneEl;
    if (!scene.is('vr-mode')) return;

    // Read VR Gamepads directly
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp  !gp.axes  gp.axes.length < 2) continue;

      const axisX = gp.axes[2] !== undefined ? gp.axes[2] : gp.axes[0];
      const axisY = gp.axes[3] !== undefined ? gp.axes[3] : gp.axes[1];

      // Left Stick (Movement)
      if (gp.hand === 'left' || i === 0) {
        if (Math.abs(axisX) > 0.15 || Math.abs(axisY) > 0.15) {
          const camera = document.querySelector('#camera').object3D;
          const rig = this.el.object3D;
          const angle = camera.rotation.y;
          rig.position.x += (axisX * Math.cos(angle) + axisY * Math.sin(angle)) * this.speed;
          rig.position.z += (-axisX * Math.sin(angle) + axisY * Math.cos(angle)) * this.speed;
        }
      }

      // Right Stick (Snap / Smooth Turn)
      if (gp.hand === 'right' || i === 1) {
        if (Math.abs(axisX) > 0.2) {
          this.el.object3D.rotation.y -= axisX * this.turnSpeed;
        }
      }
    }
  }
});

// 10. Bind Click Buttons
window.addEventListener('DOMContentLoaded', () => {
  drawDangerSign();
  updateSimulation();

  // Desktop + VR Click Handlers
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







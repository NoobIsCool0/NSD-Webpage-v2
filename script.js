/* =====================================================
   0. KATEX — render every formula properly
===================================================== */

function renderMath() {
    document.querySelectorAll("[data-latex]").forEach(function (el) {
        const tex = el.getAttribute("data-latex");
        if (!tex) return;
        try {
            katex.render(tex, el, { throwOnError: false, displayMode: true });
        } catch (e) {
            el.textContent = tex;
        }
    });
}

/* Re-render a single element with new latex (used by live readouts) */
function renderMathInto(el, tex) {
    try {
        katex.render(tex, el, { throwOnError: false, displayMode: false });
    } catch (e) {
        el.textContent = tex;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    renderMath();
});


/* =====================================================
   1. AMBIENT PARTICLE BACKGROUND
===================================================== */

const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
let particles = [];

function resizeBgCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = document.documentElement.scrollHeight;
}

function initParticles() {
    particles = [];
    const count = Math.floor((bgCanvas.width * bgCanvas.height) / 90000);
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            r: 1 + Math.random() * 2.2,
            speed: 0.15 + Math.random() * 0.35,
            drift: (Math.random() - 0.5) * 0.3,
            opacity: 0.08 + Math.random() * 0.18
        });
    }
}

function drawParticles() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = "#e87522";

    particles.forEach(function (p) {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) { p.y = bgCanvas.height + 10; p.x = Math.random() * bgCanvas.width; }
        if (p.x < -10) p.x = bgCanvas.width + 10;
        if (p.x > bgCanvas.width + 10) p.x = -10;

        bgCtx.globalAlpha = p.opacity;
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fill();
    });

    bgCtx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
}

resizeBgCanvas();
initParticles();
drawParticles();

window.addEventListener("resize", function () {
    resizeBgCanvas();
    initParticles();
});


/* =====================================================
   2. CURSOR GLOW + SCROLL PROGRESS BAR
===================================================== */

const cursorGlow = document.getElementById("cursorGlow");

document.addEventListener("mousemove", function (e) {
    cursorGlow.style.setProperty("--mx", e.clientX + "px");
    cursorGlow.style.setProperty("--my", e.clientY + "px");
    document.documentElement.style.setProperty("--mx", e.clientX + "px");
    document.documentElement.style.setProperty("--my", e.clientY + "px");
});

const progressBar = document.getElementById("progressBar");

function updateProgressBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct + "%";
}

window.addEventListener("scroll", updateProgressBar);
updateProgressBar();


/* =====================================================
   3. SCROLL REVEAL (with staggered children)
===================================================== */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");

            const children = entry.target.querySelectorAll(".reveal-child");
            children.forEach(function (child, i) {
                setTimeout(function () { child.classList.add("visible"); }, i * 90);
            });
        }
    });
}, { threshold: 0.12 });

revealElements.forEach(function (el) { revealObserver.observe(el); });


/* =====================================================
   4. NAV — SCROLLSPY + CLICK HIGHLIGHT
===================================================== */

const navLinks = document.querySelectorAll(".nav-links a");
const sections = Array.from(navLinks)
    .map(function (link) { return document.getElementById(link.dataset.section); })
    .filter(Boolean);

function updateActiveNav() {
    let currentId = sections[0] ? sections[0].id : null;
    const scrollPos = window.scrollY + 140;

    sections.forEach(function (sec) {
        if (sec.offsetTop <= scrollPos) currentId = sec.id;
    });

    navLinks.forEach(function (link) {
        link.classList.toggle("active", link.dataset.section === currentId);
    });
}

window.addEventListener("scroll", updateActiveNav);
updateActiveNav();


/* =====================================================
   5. HERO BALL — MOUSE PARALLAX
===================================================== */

const ballWrapper = document.getElementById("ballWrapper");

document.addEventListener("mousemove", function (event) {
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;
    ballWrapper.style.transform = "translate(" + x + "px," + y + "px)";
});


/* =====================================================
   6. PHYSICS CARDS + LIVE DIAGRAM
===================================================== */

const physicsContent = {
    projectile: {
        title: "Projectile Motion",
        text: "Once the basketball leaves the player's hand, it travels under the influence of gravity and follows a curved path called a parabolic trajectory. By analysing this path, the system can help predict whether the ball is likely to go into the basket.",
        latex: "y = x\\tan\\theta - \\dfrac{g x^2}{2v^2\\cos^2\\theta}"
    },
    velocity: {
        title: "Velocity",
        text: "Velocity is the speed of the basketball in a particular direction after it is released. It affects how high and how far the ball travels. The correct velocity helps the ball follow the ideal path toward the hoop.",
        latex: "v = \\dfrac{\\Delta s}{\\Delta t}"
    },
    acceleration: {
        title: "Acceleration",
        text: "After the ball is released, gravity is the major force acting on it. Gravity causes the ball's vertical velocity to change as it rises and falls, contributing to the curved path of the shot.",
        latex: "a = \\dfrac{\\Delta v}{\\Delta t} \\approx -9.8\\ \\text{m/s}^2"
    },
    angle: {
        title: "Release Angle",
        text: "The release angle is the angle at which the basketball leaves the player's hand. A very low angle creates a flatter shot, while a very high angle sends the ball too high. An appropriate release angle creates a smoother arc.",
        latex: "\\theta = \\tan^{-1}\\!\\left(\\dfrac{v_y}{v_x}\\right)"
    }
};

const physicsCanvas = document.getElementById("physicsCanvas");
const pctx = physicsCanvas.getContext("2d");

function drawPhysicsDiagram(topic) {
    const W = physicsCanvas.width, H = physicsCanvas.height;
    pctx.clearRect(0, 0, W, H);
    pctx.strokeStyle = "#2d3b50";
    pctx.lineWidth = 1;
    pctx.beginPath();
    pctx.moveTo(20, H - 30); pctx.lineTo(W - 20, H - 30);
    pctx.stroke();

    pctx.strokeStyle = "#ffb36b";
    pctx.fillStyle = "#e87522";
    pctx.lineWidth = 2.5;

    if (topic === "projectile" || topic === "angle") {
        pctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = 30 + t * (W - 60);
            const y = (H - 30) - Math.sin(Math.PI * t) * (H - 90);
            if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
        }
        pctx.stroke();

        if (topic === "angle") {
            pctx.beginPath();
            pctx.moveTo(30, H - 30);
            pctx.lineTo(90, H - 30);
            pctx.moveTo(30, H - 30);
            pctx.lineTo(80, H - 70);
            pctx.stroke();
            pctx.fillStyle = "#dce2eb";
            pctx.font = "12px Arial";
            pctx.fillText("theta", 55, H - 35);
        }
    } else if (topic === "velocity") {
        pctx.beginPath();
        pctx.moveTo(30, H - 40);
        pctx.lineTo(W - 40, 50);
        pctx.stroke();
        drawArrowHead(pctx, 30, H - 40, W - 40, 50, "#e87522");
        pctx.fillStyle = "#dce2eb";
        pctx.font = "12px Arial";
        pctx.fillText("v", (W - 40 + 30) / 2, (H - 40 + 50) / 2 - 8);
    } else if (topic === "acceleration") {
        pctx.beginPath();
        pctx.moveTo(W / 2, 40);
        pctx.lineTo(W / 2, H - 40);
        pctx.stroke();
        drawArrowHead(pctx, W / 2, 40, W / 2, H - 40, "#e87522");
        pctx.fillStyle = "#dce2eb";
        pctx.font = "12px Arial";
        pctx.fillText("g", W / 2 + 10, H / 2);
    }
}

function drawArrowHead(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 7), y2 - size * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 7), y2 - size * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
}

const physicsDetail = document.getElementById("physics-detail");
const physicsTitle = document.getElementById("physicsTitle");
const physicsText = document.getElementById("physicsText");
const physicsFormula = document.getElementById("physicsFormula");

document.querySelectorAll(".card").forEach(function (card) {
    function activate() {
        document.querySelectorAll(".card").forEach(function (c) { c.classList.remove("active"); });
        card.classList.add("active");

        const topic = card.dataset.topic;
        const data = physicsContent[topic];
        physicsTitle.textContent = data.title;
        physicsText.textContent = data.text;
        renderMathInto(physicsFormula, data.latex);
        physicsFormula.style.display = "block";
        physicsDetail.classList.add("active");
        drawPhysicsDiagram(topic);
    }

    card.addEventListener("click", activate);
    card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
});


/* =====================================================
   7. SHOT TRAJECTORY SIMULATOR — real projectile physics
===================================================== */

const angleSlider = document.getElementById("angleSlider");
const velocitySlider = document.getElementById("velocitySlider");
const angleValue = document.getElementById("angleValue");
const velocityValue = document.getElementById("velocityValue");
const resultAngle = document.getElementById("resultAngle");
const resultVelocity = document.getElementById("resultVelocity");
const resultType = document.getElementById("resultType");
const resultOutcome = document.getElementById("resultOutcome");
const outcomeBox = document.getElementById("outcomeBox");
const shootBtn = document.getElementById("shootBtn");
const simStats = document.getElementById("simStats");
const shotCanvas = document.getElementById("shotCanvas");
const sctx = shotCanvas.getContext("2d");

const G = 9.8;
const COURT_M = 7.6;      // width of court in metres
const HOOP_X_M = 6.6;     // hoop distance from shooter
const HOOP_Y_M = 1.65;    // hoop rim height
const HOOP_TOL_M = 0.38;  // vertical tolerance for a make

let shots = 0, makes = 0;
let animating = false;

function resizeShotCanvas() {
    const rect = shotCanvas.parentElement.getBoundingClientRect();
    shotCanvas.width = rect.width;
    shotCanvas.height = rect.height;
}

function trajectoryY(xM, angleDeg, v) {
    const rad = angleDeg * Math.PI / 180;
    return xM * Math.tan(rad) - (G * xM * xM) / (2 * v * v * Math.cos(rad) * Math.cos(rad));
}

function rangeM(angleDeg, v) {
    const rad = angleDeg * Math.PI / 180;
    return (v * v * Math.sin(2 * rad)) / G;
}

function toPx(xM, yM) {
    const pad = 24;
    const scaleX = (shotCanvas.width - pad * 2) / COURT_M;
    const floorY = shotCanvas.height - 22;
    const scaleY = scaleX; // keep aspect roughly consistent
    return { x: pad + xM * scaleX, y: floorY - yM * scaleY };
}

function drawCourt() {
    const floorY = toPx(0, 0).y;
    sctx.strokeStyle = "#e3ded5";
    sctx.lineWidth = 1;
    sctx.beginPath();
    sctx.moveTo(0, floorY); sctx.lineTo(shotCanvas.width, floorY);
    sctx.stroke();

    // hoop
    const hoopPx = toPx(HOOP_X_M, HOOP_Y_M);
    sctx.strokeStyle = "#17243a";
    sctx.lineWidth = 3;
    sctx.beginPath();
    sctx.moveTo(hoopPx.x + 22, hoopPx.y - 40);
    sctx.lineTo(hoopPx.x + 22, hoopPx.y);
    sctx.stroke();
    sctx.beginPath();
    sctx.ellipse(hoopPx.x, hoopPx.y, 20, 5, 0, 0, Math.PI * 2);
    sctx.strokeStyle = "#e87522";
    sctx.lineWidth = 2.5;
    sctx.stroke();
    sctx.strokeStyle = "rgba(23,36,58,0.5)";
    sctx.lineWidth = 1;
    for (let i = -18; i <= 18; i += 9) {
        sctx.beginPath();
        sctx.moveTo(hoopPx.x + i, hoopPx.y);
        sctx.lineTo(hoopPx.x + i * 0.55, hoopPx.y + 20);
        sctx.stroke();
    }
}

function drawPreviewArc(angleDeg, v) {
    const R = Math.min(rangeM(angleDeg, v), COURT_M);
    sctx.strokeStyle = "rgba(232,117,34,0.55)";
    sctx.setLineDash([6, 6]);
    sctx.lineWidth = 2;
    sctx.beginPath();
    for (let i = 0; i <= 60; i++) {
        const xM = (i / 60) * R;
        const yM = Math.max(0, trajectoryY(xM, angleDeg, v));
        const p = toPx(xM, yM);
        if (i === 0) sctx.moveTo(p.x, p.y); else sctx.lineTo(p.x, p.y);
    }
    sctx.stroke();
    sctx.setLineDash([]);
}

function drawBall(xM, yM) {
    const p = toPx(xM, yM);
    const grad = sctx.createRadialGradient(p.x - 3, p.y - 3, 1, p.x, p.y, 9);
    grad.addColorStop(0, "#ffbd7c");
    grad.addColorStop(1, "#e87522");
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    sctx.fill();
    sctx.strokeStyle = "#222";
    sctx.lineWidth = 1;
    sctx.beginPath();
    sctx.moveTo(p.x - 6, p.y); sctx.lineTo(p.x + 6, p.y);
    sctx.stroke();
}

function renderScene(angleDeg, v, ballXM, ballYM, trail) {
    sctx.clearRect(0, 0, shotCanvas.width, shotCanvas.height);
    drawCourt();
    drawPreviewArc(angleDeg, v);

    if (trail && trail.length) {
        sctx.strokeStyle = "rgba(23,36,58,0.35)";
        sctx.lineWidth = 2;
        sctx.beginPath();
        trail.forEach(function (pt, i) {
            const p = toPx(pt.x, pt.y);
            if (i === 0) sctx.moveTo(p.x, p.y); else sctx.lineTo(p.x, p.y);
        });
        sctx.stroke();
    }

    if (ballXM !== null) drawBall(ballXM, ballYM);
    else drawBall(0, 0);
}

function classifyArc(angleDeg) {
    if (angleDeg < 32) return "Low / Flat Arc";
    if (angleDeg < 55) return "Moderate Arc";
    return "High Arc";
}

function updateSimulatorPreview() {
    const angle = Number(angleSlider.value);
    const velocity = Number(velocitySlider.value);

    angleValue.textContent = angle + "\u00b0";
    velocityValue.textContent = velocity.toFixed(1) + " m/s";
    resultAngle.textContent = angle + "\u00b0";
    resultVelocity.textContent = velocity.toFixed(1) + " m/s";
    resultType.textContent = classifyArc(angle);

    if (!animating) renderScene(angle, velocity, null, 0, []);
}

function isMake(angleDeg, v) {
    const R = rangeM(angleDeg, v);
    if (R < HOOP_X_M - 0.05) return false; // falls short
    const yAtHoop = trajectoryY(HOOP_X_M, angleDeg, v);
    return Math.abs(yAtHoop - HOOP_Y_M) <= HOOP_TOL_M;
}

function shoot() {
    if (animating) return;
    animating = true;
    shootBtn.disabled = true;

    const angle = Number(angleSlider.value);
    const v = Number(velocitySlider.value);
    const made = isMake(angle, v);
    const R = rangeM(angle, v);
    const flightX = made ? HOOP_X_M : Math.min(R, COURT_M);

    const rad = angle * Math.PI / 180;
    const totalT = made
        ? (flightX / (v * Math.cos(rad)))
        : (2 * v * Math.sin(rad)) / G;

    const trail = [];
    const startTime = performance.now();
    const durationMs = 900;

    function frame(now) {
        const t = Math.min((now - startTime) / durationMs, 1);
        const flightTime = t * totalT;
        const xM = v * Math.cos(rad) * flightTime;
        const yM = Math.max(0, trajectoryY(xM, angle, v));

        trail.push({ x: xM, y: yM });
        renderScene(angle, v, xM, yM, trail);

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            finishShot(made, angle, v);
        }
    }

    requestAnimationFrame(frame);
}

function finishShot(made, angle, v) {
    shots += 1;
    if (made) makes += 1;

    resultOutcome.textContent = made ? "MAKE" : "MISS";
    outcomeBox.classList.remove("make", "miss", "flash");
    void outcomeBox.offsetWidth; // restart animation
    outcomeBox.classList.add(made ? "make" : "miss", "flash");

    const pct = shots ? Math.round((makes / shots) * 100) : 0;
    simStats.textContent = "Shots: " + shots + " \u00b7 Makes: " + makes + " (" + pct + "%)";

    animating = false;
    shootBtn.disabled = false;
}

angleSlider.addEventListener("input", updateSimulatorPreview);
velocitySlider.addEventListener("input", updateSimulatorPreview);
shootBtn.addEventListener("click", shoot);

window.addEventListener("resize", function () {
    resizeShotCanvas();
    updateSimulatorPreview();
});

resizeShotCanvas();
updateSimulatorPreview();


/* =====================================================
   8. MATH GRAPHS
===================================================== */

function setupCanvasDPR(canvas) {
    // keep drawing in CSS pixel space for simplicity; canvas already sized via width/height attrs
    return canvas.getContext("2d");
}

/* ---- 8a. Euclidean Distance — drag point B ---- */

(function () {
    const canvas = document.getElementById("distanceCanvas");
    const ctx = setupCanvasDPR(canvas);
    const readout = document.getElementById("distanceReadout");
    const W = canvas.width, H = canvas.height;

    const A = { x: 80, y: H - 70 };
    let B = { x: W - 90, y: 70 };
    let dragging = false;

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // grid
        ctx.strokeStyle = "#e3ded5";
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (let gy = 0; gy <= H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

        // right-triangle legs
        ctx.strokeStyle = "#ffb36b";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, A.y);
        ctx.moveTo(B.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // distance line
        ctx.strokeStyle = "#e87522";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.stroke();

        // points
        drawPoint(ctx, A.x, A.y, "#17243a", "A");
        drawPoint(ctx, B.x, B.y, "#e87522", "B");

        const dx = (B.x - A.x) / 30, dy = (A.y - B.y) / 30;
        const dist = Math.sqrt(dx * dx + dy * dy);
        renderMathInto(readout, "d = " + dist.toFixed(2) + "\\ \\text{units}");
    }

    function drawPoint(ctx, x, y, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#17243a";
        ctx.font = "bold 13px Arial";
        ctx.fillText(label, x + 10, y - 10);
    }

    function pos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return { x: cx * scaleX, y: cy * scaleY };
    }

    canvas.addEventListener("pointerdown", function (e) {
        const p = pos(e);
        if (Math.hypot(p.x - B.x, p.y - B.y) < 20) dragging = true;
    });
    window.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        const p = pos(e);
        B.x = Math.max(10, Math.min(W - 10, p.x));
        B.y = Math.max(10, Math.min(H - 10, p.y));
        draw();
    });
    window.addEventListener("pointerup", function () { dragging = false; });

    draw();
})();

/* ---- 8b. Cos Inverse joint angle — drag two vectors ---- */

(function () {
    const canvas = document.getElementById("angleCanvas");
    const ctx = setupCanvasDPR(canvas);
    const readout = document.getElementById("angleReadout");
    const W = canvas.width, H = canvas.height;
    const origin = { x: W / 2, y: H - 50 };
    const len = 100;

    let angA = 20, angB = 130; // degrees, measured from positive x-axis, CCW visually (screen y flipped)
    let dragging = null;

    function vecPoint(angDeg) {
        const rad = angDeg * Math.PI / 180;
        return { x: origin.x + len * Math.cos(rad), y: origin.y - len * Math.sin(rad) };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "#e3ded5";
        ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(W, origin.y); ctx.stroke();

        const pA = vecPoint(angA), pB = vecPoint(angB);

        // arc between vectors
        ctx.strokeStyle = "#ffb36b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, 32, -angB * Math.PI / 180, -angA * Math.PI / 180);
        ctx.stroke();

        drawVec(origin, pA, "#17243a", "A");
        drawVec(origin, pB, "#e87522", "B");

        const radA = angA * Math.PI / 180, radB = angB * Math.PI / 180;
        const ax = Math.cos(radA), ay = Math.sin(radA);
        const bx = Math.cos(radB), by = Math.sin(radB);
        const dot = ax * bx + ay * by;
        const thetaDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;

        renderMathInto(readout, "\\theta = \\cos^{-1}(" + dot.toFixed(2) + ") = " + thetaDeg.toFixed(1) + "^\\circ");
    }

    function drawVec(o, p, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y);
        ctx.stroke();
        drawArrowHead(ctx, o.x, o.y, p.x, p.y, color);
        ctx.fillStyle = color;
        ctx.font = "bold 13px Arial";
        ctx.fillText(label, p.x + 6, p.y - 6);
    }

    function angleFromPointer(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
        const cy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
        let deg = Math.atan2(-(cy - origin.y), cx - origin.x) * 180 / Math.PI;
        return Math.max(2, Math.min(178, deg));
    }

    canvas.addEventListener("pointerdown", function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
        const cy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
        const pA = vecPoint(angA), pB = vecPoint(angB);
        if (Math.hypot(cx - pA.x, cy - pA.y) < 22) dragging = "A";
        else if (Math.hypot(cx - pB.x, cy - pB.y) < 22) dragging = "B";
    });
    window.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        const deg = angleFromPointer(e);
        if (dragging === "A") angA = deg; else angB = deg;
        draw();
    });
    window.addEventListener("pointerup", function () { dragging = null; });

    draw();
})();

/* ---- 8c. SOH-CAH-TOA triangle — drag the angle marker ---- */

(function () {
    const canvas = document.getElementById("trigCanvas");
    const ctx = setupCanvasDPR(canvas);
    const readout = document.getElementById("trigReadout");
    const W = canvas.width, H = canvas.height;
    const base = { x: 60, y: H - 50 };
    const hyp = 190;
    let theta = 40; // degrees
    let dragging = false;

    function apex() {
        const rad = theta * Math.PI / 180;
        return { x: base.x + hyp * Math.cos(rad), y: base.y - hyp * Math.sin(rad) };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const p = apex();
        const rightAngleCorner = { x: p.x, y: base.y };

        ctx.lineWidth = 2.5;

        // adjacent
        ctx.strokeStyle = "#17243a";
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(rightAngleCorner.x, rightAngleCorner.y); ctx.stroke();
        // opposite
        ctx.strokeStyle = "#e87522";
        ctx.beginPath(); ctx.moveTo(rightAngleCorner.x, rightAngleCorner.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        // hypotenuse
        ctx.strokeStyle = "#ffb36b";
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(p.x, p.y); ctx.stroke();

        // right angle marker
        ctx.strokeStyle = "#667085";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rightAngleCorner.x - 10, rightAngleCorner.y - 10, 10, 10);

        // theta arc
        ctx.strokeStyle = "#667085";
        ctx.beginPath();
        ctx.arc(base.x, base.y, 26, -theta * Math.PI / 180, 0);
        ctx.stroke();

        // draggable handle at apex
        ctx.fillStyle = "#e87522";
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#17243a";
        ctx.font = "12px Arial";
        ctx.fillText("O", (rightAngleCorner.x + p.x) / 2 + 8, (rightAngleCorner.y + p.y) / 2);
        ctx.fillText("A", (base.x + rightAngleCorner.x) / 2, base.y + 18);
        ctx.fillText("H", (base.x + p.x) / 2 - 18, (base.y + p.y) / 2 - 8);
        ctx.fillText("\u03b8", base.x + 30, base.y - 8);

        const rad = theta * Math.PI / 180;
        const sinT = Math.sin(rad), cosT = Math.cos(rad), tanT = Math.tan(rad);
        renderMathInto(readout,
            "\\theta=" + theta.toFixed(0) + "^\\circ,\\ \\ \\sin=" + sinT.toFixed(2) +
            ",\\ \\cos=" + cosT.toFixed(2) + ",\\ \\tan=" + tanT.toFixed(2));
    }

    function pos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        return {
            x: ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX,
            y: ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY
        };
    }

    canvas.addEventListener("pointerdown", function (e) {
        const p = pos(e), a = apex();
        if (Math.hypot(p.x - a.x, p.y - a.y) < 24) dragging = true;
    });
    window.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        const p = pos(e);
        let deg = Math.atan2(-(p.y - base.y), p.x - base.x) * 180 / Math.PI;
        theta = Math.max(5, Math.min(85, deg));
        draw();
    });
    window.addEventListener("pointerup", function () { dragging = false; });

    draw();
})();

/* ---- 8d. Inverse Trigonometry — slider along arcsin curve ---- */

(function () {
    const canvas = document.getElementById("inverseTrigCanvas");
    const ctx = setupCanvasDPR(canvas);
    const readout = document.getElementById("inverseTrigReadout");
    const slider = document.getElementById("inverseTrigSlider");
    const W = canvas.width, H = canvas.height;
    const pad = 30;

    function toPx(x, yDeg) {
        const px = pad + ((x + 1) / 2) * (W - pad * 2);
        const py = H - pad - ((yDeg + 90) / 180) * (H - pad * 2);
        return { x: px, y: py };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // axes
        ctx.strokeStyle = "#e3ded5";
        ctx.lineWidth = 1;
        const zero = toPx(0, 0);
        ctx.beginPath(); ctx.moveTo(pad, zero.y); ctx.lineTo(W - pad, zero.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(zero.x, pad); ctx.lineTo(zero.x, H - pad); ctx.stroke();

        // arcsin curve
        ctx.strokeStyle = "#e87522";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = -1 + (i / 100) * 2;
            const yDeg = Math.asin(x) * 180 / Math.PI;
            const p = toPx(x, yDeg);
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // current marker
        const x = Number(slider.value) / 100;
        const yDeg = Math.asin(x) * 180 / Math.PI;
        const p = toPx(x, yDeg);

        ctx.strokeStyle = "rgba(23,36,58,0.3)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(p.x, zero.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#17243a";
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#667085";
        ctx.font = "11px Arial";
        ctx.fillText("x", W - pad + 8, zero.y + 4);
        ctx.fillText("\u03b8", zero.x - 4, pad - 8);

        renderMathInto(readout, "\\sin^{-1}(" + x.toFixed(2) + ") = " + yDeg.toFixed(1) + "^\\circ");
    }

    slider.addEventListener("input", draw);
    draw();
})();


/* =====================================================
   9. RANDOM FOREST — randomised votes + confidence
===================================================== */

const forestEl = document.getElementById("forest");
const forestResultEl = document.getElementById("forestResult");
const confFill = document.getElementById("confFill");
const confLabel = document.getElementById("confLabel");
const treeInfoEl = document.getElementById("treeInfo");
const growForestBtn = document.getElementById("growForestBtn");

const treeMessages = [
    "considers release angle and velocity most heavily.",
    "weighs distance and joint angles for its vote.",
    "focuses on acceleration through the shot.",
    "splits mainly on release angle.",
    "leans on the player's elbow and shoulder angles.",
    "weighs velocity and distance together."
];

function buildForest(numTrees) {
    forestEl.innerHTML = "";
    const votes = [];

    for (let i = 0; i < numTrees; i++) {
        const vote = Math.random() > 0.4 ? "MAKE" : "MISS"; // slight bias toward make, like a decent shooter
        votes.push(vote);

        const treeDiv = document.createElement("div");
        treeDiv.className = "tree";
        treeDiv.tabIndex = 0;
        treeDiv.innerHTML =
            '<svg class="icon" viewBox="0 0 40 40"><use href="#icon-tree"/></svg>' +
            '<div class="result">' + vote + '</div>';

        treeDiv.addEventListener("click", function () {
            document.querySelectorAll(".tree").forEach(function (t) { t.classList.remove("selected"); });
            treeDiv.classList.add("selected");
            const msg = treeMessages[i % treeMessages.length];
            treeInfoEl.textContent = "Tree " + (i + 1) + " voted " + vote + " \u2014 it " + msg;
        });

        forestEl.appendChild(treeDiv);
    }

    const makeVotes = votes.filter(function (v) { return v === "MAKE"; }).length;
    const pctMake = Math.round((makeVotes / numTrees) * 100);
    const finalCall = makeVotes >= numTrees / 2 ? "MAKE" : "MISS";

    forestResultEl.textContent = finalCall;
    forestResultEl.style.color = finalCall === "MAKE" ? "#ffb36b" : "#ff9d9d";
    confFill.style.width = (finalCall === "MAKE" ? pctMake : 100 - pctMake) + "%";
    confLabel.textContent = (finalCall === "MAKE" ? pctMake : 100 - pctMake) + "% " + finalCall.charAt(0) + finalCall.slice(1).toLowerCase();
    treeInfoEl.textContent = "Click a tree above to see its vote.";
}

growForestBtn.addEventListener("click", function () { buildForest(6); });

buildForest(6);


/* =====================================================
   10. VIDEO PLACEHOLDER CARDS
===================================================== */

document.querySelectorAll(".play-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const note = btn.parentElement.querySelector(".video-note");
        if (!note) return;
        note.classList.add("show");
        setTimeout(function () { note.classList.remove("show"); }, 1800);
    });
});
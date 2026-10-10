import React, { useEffect, useRef } from "react";
import "../assets/Style/style.css";

/* ---------- Dragon settings (inga maathina dragon size/speed maarum) ---------- */
const SEGMENTS = 44;        // evlo vertebrae (body length)
const WING_AT = [5, 14];    // entha segment la wings irukkanum (image la 2 wings)
const BLADES = 7;           // oru wing la evlo blade
const FOLLOW = 0.09;        // head cursor ah follow panra speed (0.05 slow, 0.2 fast)
const SPACING = 24;         // segments kku naduvula gap

/* ---------- Shapes (ellam +x direction ah paaththu irukkum) ---------- */
const BONE =
  "M 16 0 C 8 -2, 5 -8, -2 -11 C -1 -6, -5 -4, -13 0 C -5 4, -1 6, -2 11 C 5 8, 8 2, 16 0 Z";

const HEAD =
  "M 28 0 C 16 -3, 9 -8, 4 -19 C 0 -12, -5 -10, -13 -9 C -17 -4, -17 4, -13 9 C -5 10, 0 12, 4 19 C 9 8, 16 3, 28 0 Z";

const EYE_TOP = "M 6 -5 Q 11 -8 15 -3 Q 10 -3 6 -5 Z";
const EYE_BOTTOM = "M 6 5 Q 11 8 15 3 Q 10 3 6 5 Z";

const bladePath = (l) =>
  `M 0 0 C ${l * 0.3} ${-l * 0.35}, ${l * 0.7} ${-l * 0.4}, ${l} ${-l * 0.15} ` +
  `C ${l * 0.65} ${-l * 0.28}, ${l * 0.3} ${-l * 0.2}, 0 4 Z`;

/* segment index -> size (head perusu, tail chinna) */
const scaleAt = (i) => (i === 0 ? 1.15 : Math.max(0.14, 1 - (i / SEGMENTS) * 0.88));
/* segment index -> colour (cyan -> purple -> pink) */
const hueAt = (i) => 180 + (i / SEGMENTS) * 140;

function Proj() {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    /* DOM elements ah onnu thadavai eduthukkurom, apram direct ah move panrom */
    const segs = [];
    svg.querySelectorAll(".seg").forEach((el) => {
      segs[Number(el.dataset.i)] = el;
    });
    const wings = [...svg.querySelectorAll(".wing")].map((el) => ({
      el,
      at: Number(el.dataset.at),
      side: Number(el.dataset.side),
      phase: Number(el.dataset.phase),
      blades: [...el.querySelectorAll(".blade")].map((b) => ({
        el: b,
        base: Number(b.dataset.a),
      })),
    }));

    /* ovvoru segment oda x,y position */
    const pts = Array.from({ length: SEGMENTS }, (_, i) => ({
      x: window.innerWidth / 2 - i * 10,
      y: window.innerHeight / 2,
    }));
    const ang = new Array(SEGMENTS).fill(0);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let lastMove = 0;
    let raf;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastMove = performance.now();
    };
    window.addEventListener("pointermove", onMove);

    const tick = (now) => {
      const time = now / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      /* 1) Target: cursor. Cursor 2.5s asaiyala na dragon thaanaa parakkum */
      let tx = mouse.x;
      let ty = mouse.y;
      if (now - lastMove > 2500) {
        tx = w / 2 + Math.cos(time * 0.6) * w * 0.3;
        ty = h / 2 + Math.sin(time * 0.9) * h * 0.25;
      }

      /* 2) Head target ah nokki konjam konjama move aagum (easing) */
      pts[0].x += (tx - pts[0].x) * FOLLOW;
      pts[0].y += (ty - pts[0].y) * FOLLOW;

      /* 3) Ovvoru segment um munnadi irukkura segment ah follow pannum */
      for (let i = 1; i < SEGMENTS; i++) {
        const dx = pts[i - 1].x - pts[i].x;
        const dy = pts[i - 1].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 1;
        const gap = SPACING * scaleAt(i);
        pts[i].x = pts[i - 1].x - (dx / d) * gap;
        pts[i].y = pts[i - 1].y - (dy / d) * gap;
        ang[i] = Math.atan2(dy, dx);
      }
      ang[0] = Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x);

      /* 4) SVG ku position + rotation + size apply */
      for (let i = 0; i < SEGMENTS; i++) {
        segs[i].setAttribute(
          "transform",
          `translate(${pts[i].x} ${pts[i].y}) rotate(${(ang[i] * 180) / Math.PI}) scale(${scaleAt(i)})`
        );
      }

      /* 5) Wings: segment oda kooda move + flap */
      wings.forEach((wg) => {
        const s = scaleAt(wg.at);
        wg.el.setAttribute(
          "transform",
          `translate(${pts[wg.at].x} ${pts[wg.at].y}) rotate(${(ang[wg.at] * 180) / Math.PI}) scale(${s} ${s * wg.side})`
        );
        wg.blades.forEach((b, k) => {
          const flap = Math.sin(time * 3.2 + wg.phase + k * 0.28) * (6 + k * 1.2);
          b.el.setAttribute("transform", `rotate(${b.base + flap})`);
        });
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  /* spine tail-la irundhu head varaikkum draw (head top la theriyum) */
  const order = Array.from({ length: SEGMENTS }, (_, k) => SEGMENTS - 1 - k);

  return (
    <div className="dragon-stage">
      <svg ref={svgRef} className="dragon-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="dragon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#dragon-glow)">
          {/* Wings (spine ku keela) */}
          {WING_AT.map((at, wi) =>
            [1, -1].map((side) => (
              <g
                key={`w-${at}-${side}`}
                className="wing"
                data-at={at}
                data-side={side}
                data-phase={wi * 1.3}
              >
                {Array.from({ length: BLADES }, (_, k) => {
                  const a = -80 - k * 13;
                  const len = 150 * (0.55 + 0.45 * Math.sin((k / (BLADES - 1)) * Math.PI));
                  return (
                    <path
                      key={k}
                      className="blade"
                      data-a={a}
                      d={bladePath(len)}
                      transform={`rotate(${a})`}
                      fill={`hsl(${hueAt(at) + k * 6}, 100%, 62%)`}
                      fillOpacity="0.8"
                    />
                  );
                })}
              </g>
            ))
          )}

          {/* Spine + head */}
          {order.map((i) => (
            <g key={i} className="seg" data-i={i}>
              {i === 0 ? (
                <>
                  <path
                    d={HEAD}
                    fill="#05060c"
                    stroke={`hsl(${hueAt(0)}, 100%, 65%)`}
                    strokeWidth="2.2"
                  />
                  <path d={EYE_TOP} fill="#fff" />
                  <path d={EYE_BOTTOM} fill="#fff" />
                </>
              ) : (
                <path d={BONE} fill={`hsl(${hueAt(i)}, 100%, 60%)`} />
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default Proj;
/* ============================================================
   Efeitos visuais (vindos do portfólio antigo, recoloridos):
   vórtice no hero, buraco negro em "Por que eu", esfera de
   partículas na stack, chama ASCII no contato, faíscas no clique,
   brilho do cursor e grade de pixels nos cards.
   Tudo decorativo: pausa fora da tela e respeita reduced-motion.
   ============================================================ */
(() => {
    "use strict";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const TAU = Math.PI * 2;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    // paleta do site (tema escuro; no claro o CSS inverte os canvas)
    const AMBER = [255, 181, 71];
    const AMBER_2 = [255, 208, 138];
    const CYAN = [66, 226, 196];
    const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], t)));
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const isLight = () => {
        const t = document.documentElement.getAttribute("data-theme");
        return t ? t === "light" : window.matchMedia("(prefers-color-scheme: light)").matches;
    };

    function fitCanvas(canvas, ctx, width, height, maxDpr) {
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        const w = Math.max(1, Math.round(width));
        const h = Math.max(1, Math.round(height));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { w, h };
    }

    /* ---------- base: canvas que só anima quando visível ---------- */
    class CanvasEffect {
        constructor(canvas, fps = 30) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.w = 1;
            this.h = 1;
            this.interval = 1000 / fps;
            this.running = false;
            this.visible = false;
            this.raf = 0;
            this.last = 0;
            this.lastDraw = 0;
            this.loop = (t) => this.frame(t);
        }

        connect(container) {
            const resize = () => {
                const r = container.getBoundingClientRect();
                const s = fitCanvas(this.canvas, this.ctx, r.width, r.height, 1.5);
                this.w = s.w;
                this.h = s.h;
                this.onResize();
                this.draw(0);
            };
            new ResizeObserver(resize).observe(container);
            new IntersectionObserver((entries) => {
                this.visible = entries[0].isIntersecting;
                if (this.visible) this.start(); else this.stop();
            }, { rootMargin: "120px" }).observe(container);
            resize();
        }

        start() {
            if (this.running || !this.visible || reduce) return;
            this.running = true;
            this.last = performance.now();
            this.raf = requestAnimationFrame(this.loop);
        }

        stop() {
            this.running = false;
            cancelAnimationFrame(this.raf);
        }

        frame(now) {
            if (!this.running) return;
            if (now - this.lastDraw >= this.interval) {
                const dt = clamp((now - this.last) / 1000, 0, 0.066);
                this.last = now;
                this.lastDraw = now;
                this.draw(dt);
            }
            this.raf = requestAnimationFrame(this.loop);
        }

        onResize() {}
        draw() {}
    }

    /* ---------- cena que se transforma ao rolar (camada fixa) ----------
       Ideia vinda do portfólio do Humberto, refeita em canvas 2D: as mesmas
       partículas viram um símbolo por seção, ao lado do título dela. */
    const SHAPE_W = 420, SHAPE_H = 300;

    function sampleShape(drawFn, count) {
        const c = document.createElement("canvas");
        c.width = SHAPE_W;
        c.height = SHAPE_H;
        const g = c.getContext("2d");
        g.fillStyle = g.strokeStyle = "#fff";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineCap = "round";
        drawFn(g);
        const data = g.getImageData(0, 0, SHAPE_W, SHAPE_H).data;
        let pts = [];
        for (let step = 3; step < 12; step++) {
            pts = [];
            for (let y = 0; y < SHAPE_H; y += step) {
                for (let x = 0; x < SHAPE_W; x += step) {
                    if (data[(y * SHAPE_W + x) * 4 + 3] > 128) pts.push([x, y]);
                }
            }
            if (pts.length < count * 2.5) break;
        }
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        // embaralha para a transição sair orgânica, e completa até "count" com leve tremor
        for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
        const out = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
            const [x, y] = pts[i % pts.length];
            const jitter = i < pts.length ? 0 : 1.5;
            out[i * 2] = x - cx + (Math.random() - 0.5) * jitter;
            out[i * 2 + 1] = y - cy + (Math.random() - 0.5) * jitter;
        }
        return { pts: out, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    }

    const SHAPES = {
        code: (g) => { g.font = "700 190px 'JetBrains Mono', monospace"; g.fillText("</>", 210, 150); },
        bars: (g) => {
            [70, 120, 95, 175, 240].forEach((h, i) => g.fillRect(40 + i * 72, 270 - h, 46, h));
            g.fillRect(24, 278, 372, 8);
        },
        quote: (g) => { g.font = "800 300px Archivo, Georgia, serif"; g.fillText("“”", 210, 190); },
        braces: (g) => { g.font = "700 200px 'JetBrains Mono', monospace"; g.fillText("{ }", 210, 150); },
        branch: (g) => {
            g.lineWidth = 12;
            g.beginPath(); g.moveTo(130, 20); g.lineTo(130, 280); g.stroke();
            g.beginPath(); g.moveTo(130, 85); g.bezierCurveTo(130, 120, 290, 110, 290, 150); g.lineTo(290, 175); g.bezierCurveTo(290, 215, 130, 200, 130, 235); g.stroke();
            for (const [x, y] of [[130, 30], [130, 85], [290, 150], [130, 160], [130, 235], [130, 275]]) { g.beginPath(); g.arc(x, y, 19, 0, TAU); g.fill(); }
        },
        term: (g) => { g.font = "700 210px 'JetBrains Mono', monospace"; g.fillText(">_", 210, 150); },
        at: (g) => { g.font = "700 270px 'JetBrains Mono', monospace"; g.fillText("@", 210, 160); },
    };

    class Morph {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.count = 1400;
            this.time = 0;
            this.alpha = 0;
            this.current = null;
            this.running = false;
            this.raf = 0;
            this.loop = (t) => this.frame(t);
            const n = this.count;
            this.pos = new Float32Array(n * 2);
            this.phase = new Float32Array(n);
            this.tone = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
                this.pos[i * 2] = Math.random() * window.innerWidth;
                this.pos[i * 2 + 1] = Math.random() * window.innerHeight;
                this.phase[i] = Math.random() * TAU;
                this.tone[i] = Math.random() < 0.3 ? 2 : Math.random() < 0.5 ? 1 : 0;
            }
            this.colors = [rgba(AMBER, 0.85), rgba(AMBER_2, 0.75), rgba(CYAN, 0.8)];
        }

        // onde a forma fica em cada seção (retângulo na tela) ou null para sumir
        zone(section) {
            const vw = window.innerWidth;
            if (vw < 860) return null;
            const id = section.id;
            const head = section.querySelector(".section-head");
            if (id === "topo") {
                const r = section.querySelector(".flow-card").getBoundingClientRect();
                return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.42, w: r.width * 1.45, h: r.height * 0.6 };
            }
            if (id === "trajetoria") {
                if (vw < 1060) return null;
                const r = head.getBoundingClientRect();
                const sec = section.getBoundingClientRect();
                const cy = Math.min(r.bottom + 140, sec.bottom - 140);
                return { cx: r.left + r.width / 2, cy, w: r.width * 0.7, h: 220 };
            }
            if (id === "contato") {
                const shell = section.querySelector(".shell");
                const left = shell.getBoundingClientRect().left + parseFloat(getComputedStyle(shell).paddingLeft);
                const r = section.querySelector("h2").getBoundingClientRect();
                const w = left - 40;
                return w < 150 ? null : { cx: 16 + w / 2, cy: r.top + r.height / 2, w, h: 220 };
            }
            if (!head) return null;
            const r = head.getBoundingClientRect();
            const shell = head.closest(".shell");
            const right = shell.getBoundingClientRect().right - parseFloat(getComputedStyle(shell).paddingRight);
            // até onde o texto do título realmente vai (o bloco ocupa a largura toda)
            let textRight = r.left;
            const range = document.createRange();
            for (const el of head.querySelectorAll("h2, .lead")) {
                range.selectNodeContents(el);
                textRight = Math.max(textRight, range.getBoundingClientRect().right);
            }
            const x1 = textRight + 48;
            const w = right - x1;
            return w < 200 ? null : { cx: x1 + w / 2, cy: r.top + r.height / 2, w, h: Math.min(260, r.height + 90) };
        }

        mount() {
            const resize = () => fitCanvas(this.canvas, this.ctx, window.innerWidth, window.innerHeight, 1.5);
            window.addEventListener("resize", resize, { passive: true });
            resize();
            this.sections = [...document.querySelectorAll("[data-morph]")];
            const io = new IntersectionObserver((entries) => {
                for (const e of entries) if (e.isIntersecting) this.setSection(e.target);
            }, { rootMargin: "-45% 0px -54% 0px" });
            this.sections.forEach((s) => io.observe(s));
            // fontes carregadas antes de desenhar os glifos
            (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
                this.shapes = {};
                for (const k in SHAPES) this.shapes[k] = sampleShape(SHAPES[k], this.count);
                this.setSection(this.current || this.sections[0]);
                this.start();
            });
            document.addEventListener("visibilitychange", () => (document.hidden ? this.stop() : this.start()));
        }

        setSection(section) {
            this.current = section;
            this.shape = this.shapes ? this.shapes[section.dataset.morph] || null : null;
        }

        start() {
            if (this.running || !this.shapes) return;
            this.running = true;
            this.last = performance.now();
            this.raf = requestAnimationFrame(this.loop);
        }

        stop() {
            this.running = false;
            cancelAnimationFrame(this.raf);
        }

        frame(now) {
            if (!this.running) return;
            const dt = clamp((now - this.last) / 1000, 0, 0.05);
            this.last = now;
            this.time += dt;
            const zone = this.shape && this.current ? this.zone(this.current) : null;
            const ease = 1 - Math.exp(-dt * 5);
            this.alpha += ((zone ? 1 : 0) - this.alpha) * (1 - Math.exp(-dt * 4));
            const ctx = this.ctx;
            const W = window.innerWidth, H = window.innerHeight;
            // oculta (celular, seção sem forma): limpa uma vez e fica ociosa
            if (this.alpha < 0.01 && !zone) {
                if (!this.cleared) { ctx.clearRect(0, 0, W, H); this.cleared = true; }
                this.raf = requestAnimationFrame(this.loop);
                return;
            }
            this.cleared = false;
            ctx.clearRect(0, 0, W, H);
            const pos = this.pos, n = this.count;
            if (zone) {
                const pts = this.shape.pts;
                const scale = Math.min(zone.w / this.shape.w, zone.h / this.shape.h);
                for (let i = 0; i < n; i++) {
                    const ph = this.phase[i];
                    const tx = zone.cx + pts[i * 2] * scale + Math.sin(this.time * 1.3 + ph) * 1.4;
                    const ty = zone.cy + pts[i * 2 + 1] * scale + Math.cos(this.time * 1.1 + ph) * 1.4;
                    // aproximação em espiral: componente perpendicular some ao chegar
                    const dx = tx - pos[i * 2], dy = ty - pos[i * 2 + 1];
                    pos[i * 2] += (dx - dy * 0.35) * ease;
                    pos[i * 2 + 1] += (dy + dx * 0.35) * ease;
                }
            } else {
                // sem forma: as partículas se soltam e somem
                for (let i = 0; i < n; i++) {
                    pos[i * 2] += Math.cos(this.phase[i]) * 30 * dt;
                    pos[i * 2 + 1] += Math.sin(this.phase[i]) * 30 * dt - 12 * dt;
                }
            }
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = this.alpha;
            for (let t = 0; t < 3; t++) {
                ctx.fillStyle = this.colors[t];
                for (let i = 0; i < n; i++) {
                    if (this.tone[i] !== t) continue;
                    const x = pos[i * 2], y = pos[i * 2 + 1];
                    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
                    ctx.fillRect(x, y, 1.7, 1.7);
                }
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            this.raf = requestAnimationFrame(this.loop);
        }
    }

    /* ---------- buraco negro com rastro ("Por que eu") ---------- */
    class BlackHole {
        constructor(container) {
            this.container = container;
            this.back = document.createElement("canvas");
            this.front = document.createElement("canvas");
            this.back.className = "fx-bh-layer";
            this.front.className = "fx-bh-layer";
            container.append(this.back, this.front);
            this.bctx = this.back.getContext("2d");
            this.fctx = this.front.getContext("2d");
            this.voidR = 54;
            this.palette();
            document.addEventListener("themechange", () => this.palette());
            window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => this.palette());
            this.w = 1;
            this.h = 1;
            this.running = false;
            this.visible = false;
            this.raf = 0;
            this.last = performance.now();
            this.loop = (t) => this.frame(t);
        }

        mount() {
            new ResizeObserver(() => this.resize()).observe(this.container);
            new IntersectionObserver((entries) => {
                this.visible = entries[0].isIntersecting;
                if (this.visible) this.start(); else this.stop();
            }, { rootMargin: "80px" }).observe(this.container);
            this.resize();
        }

        resize() {
            const w = this.container.clientWidth || 600;
            const h = this.container.clientHeight || 600;
            this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            for (const c of [this.back, this.front]) {
                c.width = Math.max(1, Math.round(w * this.dpr));
                c.height = Math.max(1, Math.round(h * this.dpr));
            }
            if (w !== this.w || h !== this.h) {
                this.w = w;
                this.h = h;
                this.seed();
            }
            // redimensionar limpa o canvas: redesenha se não estiver animando
            if (!this.running) this.frame(performance.now(), true);
        }

        // escuro: brilho aditivo; claro: tinta escura por cima (o vazio fica preto nos dois)
        palette() {
            this.light = isLight();
            this.blend = this.light ? "source-over" : "lighter";
            const next = this.light ? ["#3d2a10", "#7a4500", "#9a5800", "#00775f"] : ["#fff4dc", "#ffd08a", "#ffb547", "#42e2c4"];
            if (this.particles) for (const p of this.particles) p.color = next[this.colors.indexOf(p.color)] || next[0];
            this.colors = next;
            this.rings = this.light
                ? [[1.45, 14, "rgba(61,42,16,.14)"], [1.68, 6, "rgba(154,88,0,.4)"], [1.92, 4, "rgba(0,119,95,.3)"]]
                : [[1.45, 14, "rgba(255,244,220,.2)"], [1.68, 6, "rgba(255,181,71,.42)"], [1.92, 4, "rgba(66,226,196,.26)"]];
        }

        outerR() { return this.voidR + 0.5 * (this.w / 2 - this.voidR); }

        seed() {
            const outer = this.outerR();
            const count = this.w < 700 ? 700 : 1500;
            this.particles = Array.from({ length: count }, () => ({
                angle: Math.random() * TAU,
                radius: this.voidR + Math.pow(Math.random(), 2) * (outer - this.voidR),
                height: (Math.random() - 0.5) * 16,
                speed: 0.75 + Math.random() * 0.5,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
            }));
        }

        start() {
            if (this.running || !this.visible || reduce) return;
            this.running = true;
            this.last = performance.now();
            this.raf = requestAnimationFrame(this.loop);
        }

        stop() {
            this.running = false;
            cancelAnimationFrame(this.raf);
        }

        fade(ctx) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0,0.04)";
            ctx.fillRect(0, 0, this.w, this.h);
            ctx.globalCompositeOperation = "source-over";
        }

        drawCenter(ctx, cx, cy) {
            const r = this.voidR;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((160 * Math.PI) / 180);
            ctx.scale(1, 0.22);
            ctx.globalCompositeOperation = this.blend;
            for (const ring of this.rings) {
                ctx.strokeStyle = ring[2];
                ctx.lineWidth = ring[1];
                ctx.beginPath();
                ctx.arc(0, 0, r * ring[0], 0, TAU);
                ctx.stroke();
            }
            ctx.restore();
            const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.05, cx, cy, r);
            g.addColorStop(0, "#0d0f13");
            g.addColorStop(0.65, "#000");
            g.addColorStop(1, "#16191f");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, TAU);
            ctx.fill();
        }

        frame(now, once) {
            if (!once && !this.running) return;
            const dt = Math.min((now - this.last) / 16.667, 3);
            this.last = now;
            const { w, h } = this;
            const bg = this.bctx;
            const fg = this.fctx;
            bg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            fg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.fade(bg);
            this.fade(fg);

            const outer = this.outerR();
            // no espaço livre à direita do título da seção
            const cx = (w < 860 ? 0.92 : 0.86) * w;
            const cy = Math.min(0.3 * h, 190);
            const tilt = (20 * Math.PI) / 180;
            const side = (160 * Math.PI) / 180;
            const back = [];
            const front = [];
            for (const p of this.particles) {
                const sf = Math.sqrt(this.voidR / Math.max(p.radius, 10));
                // sem frame anterior (reduce/1º desenho): espalha para mostrar o disco
                p.angle += once ? 0 : 4 * sf * p.speed * 0.012 * dt;
                const xb = p.radius * Math.cos(p.angle);
                const zb = p.radius * Math.sin(p.angle);
                const y1 = p.height * Math.cos(tilt) + zb * Math.sin(tilt);
                const z1 = -p.height * Math.sin(tilt) + zb * Math.cos(tilt);
                const x3 = xb * Math.cos(side) - y1 * Math.sin(side);
                const y3 = xb * Math.sin(side) + y1 * Math.cos(side);
                const scale = 1300 / (1300 + z1);
                const x = cx + x3 * scale;
                const y = cy + y3 * scale;
                if (x < -30 || x > w + 30 || y < -30 || y > h + 30) continue;
                const item = { x, y, z: z1, size: Math.max(0.3, 0.9 * scale), alpha: Math.max(0.35, 1 - ((z1 + outer) / (2 * outer)) * 0.45), color: p.color };
                (z1 >= 0 ? back : front).push(item);
            }
            back.sort((a, b) => b.z - a.z);
            front.sort((a, b) => b.z - a.z);
            this.drawParticles(bg, back);
            this.drawCenter(bg, cx, cy);
            this.drawParticles(fg, front);
            if (!once && this.running) this.raf = requestAnimationFrame(this.loop);
        }

        drawParticles(ctx, list) {
            ctx.globalCompositeOperation = this.blend;
            for (const p of list) {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, TAU);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        }
    }

    /* ---------- esfera de partículas (stack), gira e segue o mouse ---------- */
    class Sphere extends CanvasEffect {
        constructor(canvas) {
            super(canvas, 40);
            this.rotY = 0;
            this.rotX = 0;
            this.targetX = 0;
            this.targetY = 0;
            canvas.addEventListener("pointermove", (e) => {
                const r = canvas.getBoundingClientRect();
                this.targetY = ((e.clientX - r.left) / r.width - 0.5) * 0.85;
                this.targetX = ((e.clientY - r.top) / r.height - 0.5) * -0.55;
            }, { passive: true });
            canvas.addEventListener("pointerleave", () => { this.targetX = 0; this.targetY = 0; });
        }

        onResize() {
            const count = this.w < 300 ? 340 : 520;
            const golden = Math.PI * (3 - Math.sqrt(5));
            this.points = Array.from({ length: count }, (_, i) => {
                const y = 1 - (i / (count - 1)) * 2;
                const rad = Math.sqrt(1 - y * y);
                return { x: Math.cos(golden * i) * rad, y, z: Math.sin(golden * i) * rad, size: 0.55 + Math.random() * 1.15, alpha: 0.4 + Math.random() * 0.6 };
            });
        }

        draw(dt) {
            const ctx = this.ctx;
            this.rotY += dt * 0.24;
            this.rotX = lerp(this.rotX, this.targetX, 0.045);
            const ay = this.rotY + this.targetY * 0.9;
            const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(this.rotX), sX = Math.sin(this.rotX);
            const R = Math.min(this.w, this.h) * 0.4;
            const cx = this.w / 2, cy = this.h / 2;
            const persp = R * 3.8;
            const out = this.points.map((p) => {
                const x1 = p.x * cY - p.z * sY;
                const z1 = p.x * sY + p.z * cY;
                const y1 = p.y * cX - z1 * sX;
                const z2 = p.y * sX + z1 * cX;
                const s = persp / (persp - z2 * R);
                return { x: cx + x1 * R * s, y: cy + y1 * R * s, z: z2, s, p };
            }).sort((a, b) => a.z - b.z);
            ctx.clearRect(0, 0, this.w, this.h);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (const o of out) {
                const front = (o.z + 1) / 2;
                ctx.fillStyle = rgba(mix(AMBER, CYAN, front), o.p.alpha * (0.15 + front * 0.78));
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.p.size * o.s * (0.7 + front * 0.85), 0, TAU);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    /* ---------- faíscas no clique ---------- */
    function clickBursts(canvas) {
        const ctx = canvas.getContext("2d");
        let w = 1, h = 1, raf = 0, last = 0, parts = [], rings = [];
        const resize = () => { const s = fitCanvas(canvas, ctx, window.innerWidth, window.innerHeight, 1.5); w = s.w; h = s.h; };
        const draw = (now) => {
            const dt = clamp((now - last) / 1000, 0, 0.05);
            last = now;
            ctx.clearRect(0, 0, w, h);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (const r of rings) {
                r.age += dt;
                const k = r.age / r.life;
                ctx.strokeStyle = rgba(AMBER, (1 - k) * 0.7);
                ctx.lineWidth = 1.4 * (1 - k);
                ctx.beginPath();
                ctx.arc(r.x, r.y, 8 + k * 38, 0, TAU);
                ctx.stroke();
            }
            for (const p of parts) {
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= Math.pow(0.91, dt * 60);
                p.vy *= Math.pow(0.91, dt * 60);
                const a = clamp(p.life / 0.8, 0, 1);
                ctx.fillStyle = rgba(p.c, a);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * a, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
            rings = rings.filter((r) => r.age < r.life);
            parts = parts.filter((p) => p.life > 0);
            if (rings.length || parts.length) raf = requestAnimationFrame(draw);
            else { raf = 0; ctx.clearRect(0, 0, w, h); }
        };
        window.addEventListener("resize", resize, { passive: true });
        document.addEventListener("pointerdown", (e) => {
            for (let i = 0; i < 9; i++) {
                const a = (i / 9) * TAU + Math.random() * 0.18;
                const v = 42 + Math.random() * 72;
                parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.55 + Math.random() * 0.25, size: 1 + Math.random() * 1.5, c: i % 3 ? AMBER : CYAN });
            }
            rings.push({ x: e.clientX, y: e.clientY, age: 0, life: 0.42 });
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); }
        }, { passive: true });
        resize();
    }

    /* ---------- chama ASCII (contato) ---------- */
    function asciiFlame(el) {
        const cols = 80, rows = 28, chars = " .:-=+*#%@";
        let heat = new Float32Array(cols * rows), next = new Float32Array(cols * rows);
        let raf = 0, last = 0, visible = false;
        const step = () => {
            for (let x = 0; x < cols; x++) heat[(rows - 1) * cols + x] = 0.55 + Math.random() * 0.45;
            next.fill(0);
            for (let y = 0; y < rows - 1; y++) {
                for (let x = 0; x < cols; x++) {
                    const below = (y + 1) * cols + x;
                    const below2 = Math.min(rows - 1, y + 2) * cols + x;
                    const side = (y + 1) * cols + clamp(x + (Math.random() < 0.5 ? -1 : 1), 0, cols - 1);
                    next[y * cols + x] = clamp(heat[below] * 0.58 + heat[below2] * 0.28 + heat[side] * 0.14 - (0.018 + Math.random() * 0.045), 0, 1);
                }
            }
            [heat, next] = [next, heat];
            let out = "";
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const v = heat[y * cols + x];
                    out += v < 0.03 ? " " : chars[Math.floor(v * (chars.length - 1))];
                }
                out += "\n";
            }
            el.textContent = out;
        };
        const loop = (now) => {
            if (now - last > 80) { last = now; step(); }
            if (visible) raf = requestAnimationFrame(loop);
        };
        if (reduce) { for (let i = 0; i < rows; i++) step(); return; }
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            cancelAnimationFrame(raf);
            if (visible) raf = requestAnimationFrame(loop);
        }).observe(el.parentElement); // o <pre> começa vazio (sem área)
    }

    /* ---------- brilho que segue o cursor ---------- */
    function cursorGlow(el) {
        let x = window.innerWidth / 2, y = window.innerHeight * 0.35, tx = x, ty = y, raf = 0;
        const follow = () => {
            x += (tx - x) * 0.09;
            y += (ty - y) * 0.09;
            el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(follow) : 0;
        };
        window.addEventListener("pointermove", (e) => {
            tx = e.clientX;
            ty = e.clientY;
            el.classList.add("is-on");
            if (!raf) raf = requestAnimationFrame(follow);
        }, { passive: true });
        document.documentElement.addEventListener("pointerleave", () => el.classList.remove("is-on"));
    }

    /* ---------- grade de pixels sob o mouse nos cards ---------- */
    function pixelCards() {
        document.querySelectorAll(".case, .repo, .rec, .value, .metric").forEach((card) => {
            card.classList.add("fx-pix");
            card.addEventListener("pointermove", (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty("--px", `${((e.clientX - r.left) / r.width) * 100}%`);
                card.style.setProperty("--py", `${((e.clientY - r.top) / r.height) * 100}%`);
            }, { passive: true });
        });
    }

    const $ = (s) => document.querySelector(s);
    const morph = $("#fx-morph");
    if (morph && !reduce) new Morph(morph).mount();
    const sphere = $("#fx-sphere");
    if (sphere) new Sphere(sphere).connect(sphere.parentElement);
    document.querySelectorAll("[data-black-hole]").forEach((el) => new BlackHole(el).mount());
    const flame = $("#fx-flame");
    if (flame) asciiFlame(flame);
    if (!reduce) {
        const click = $("#fx-click");
        if (click) clickBursts(click);
        if (finePointer) {
            const glow = $("#fx-glow");
            if (glow) cursorGlow(glow);
            pixelCards();
        }
    }
})();

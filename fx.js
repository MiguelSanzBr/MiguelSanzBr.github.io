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

    /* ---------- vórtice (hero) ---------- */
    class Vortex extends CanvasEffect {
        constructor(canvas) {
            super(canvas);
            this.time = 0;
            this.pointer = { x: 0, tx: 0 };
            if (finePointer) {
                window.addEventListener("pointermove", (e) => {
                    this.pointer.tx = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
                }, { passive: true });
            }
        }

        onResize() {
            const count = this.w < 680 ? 240 : this.w < 1100 ? 360 : 480;
            const strands = this.w < 680 ? 12 : 18;
            this.points = Array.from({ length: count }, (_, i) => ({
                t: Math.random(),
                angle: Math.random() * TAU,
                speed: 0.24 + Math.random() * 0.42,
                drift: Math.random() * TAU,
                size: 0.6 + Math.random() * 1.8,
                alpha: 0.3 + Math.random() * 0.7,
                lane: i % strands,
            }));
            this.lines = Array.from({ length: strands }, (_, i) => ({
                lane: (i / strands) * TAU,
                speed: 0.22 + Math.random() * 0.09,
                phase: Math.random() * TAU,
            }));
        }

        radiusAt(t) {
            const bottom = this.w * 0.29;
            const waist = Math.max(23, this.w * 0.025);
            const top = this.w * 0.16;
            if (t < 0.48) return lerp(bottom, waist, Math.pow(t / 0.48, 0.83));
            return lerp(waist, top, Math.pow((t - 0.48) / 0.52, 1.25));
        }

        project(t, angle, phase) {
            const cx = this.w * (this.w < 900 ? 0.76 : 0.78) + this.pointer.x * 16;
            const y = lerp(this.h * 1.06, -this.h * 0.12, t) + Math.sin(t * 17 + phase + this.time * 0.4) * 2.3;
            const depth = Math.sin(angle);
            const persp = 0.76 + (depth + 1) * 0.16;
            return { x: cx + Math.cos(angle) * this.radiusAt(t) * persp, y, depth, persp };
        }

        draw(dt) {
            const ctx = this.ctx;
            this.time += dt;
            this.pointer.x = lerp(this.pointer.x, this.pointer.tx, 0.035);
            ctx.clearRect(0, 0, this.w, this.h);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            const grad = ctx.createLinearGradient(0, this.h, 0, 0);
            grad.addColorStop(0, rgba(AMBER, 0));
            grad.addColorStop(0.2, rgba(AMBER, 0.12));
            grad.addColorStop(0.55, rgba(CYAN, 0.2));
            grad.addColorStop(1, rgba(AMBER_2, 0));
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.65;
            for (const line of this.lines) {
                ctx.beginPath();
                for (let i = 0; i <= 48; i++) {
                    const t = i / 48;
                    const p = this.project(t, line.lane + t * TAU * 2.3 + this.time * line.speed, line.phase);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            }

            const sorted = this.points
                .map((pt) => ({ pt, p: this.project(pt.t, pt.angle + pt.t * TAU * 2.5 + this.time * pt.speed, pt.drift) }))
                .sort((a, b) => a.p.depth - b.p.depth);
            for (const { pt, p } of sorted) {
                const front = (p.depth + 1) / 2;
                const size = pt.size * p.persp * (0.7 + front * 0.8);
                ctx.fillStyle = rgba(mix(AMBER, CYAN, clamp(pt.t * 1.35, 0, 1)), pt.alpha * (0.22 + front * 0.78));
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
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
    const vortex = $("#fx-vortex");
    if (vortex) new Vortex(vortex).connect(vortex.parentElement);
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

/* Miguel Sanz — portfólio. JS puro, sem dependências. */
(() => {
    "use strict";
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
    const fmt = (n, dec = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

    /* ---------- tema ---------- */
    const themeBtn = $("#theme-toggle");
    const themeNow = () => root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    // barra do navegador e rótulo do botão acompanham o tema escolhido, não só o do sistema
    const syncTheme = () => {
        if (root.hasAttribute("data-theme")) $$('meta[name="theme-color"]').forEach((m) => { m.content = css("--bg"); });
        themeBtn.setAttribute("aria-label", themeNow() === "light" ? "Ativar tema escuro" : "Ativar tema claro");
    };
    syncTheme();
    themeBtn.addEventListener("click", () => {
        const next = themeNow() === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("ms-theme", next); } catch (e) {}
        syncTheme();
        document.dispatchEvent(new Event("themechange"));
    });

    /* ---------- menu mobile ---------- */
    const menuBtn = $("#menu-toggle");
    const mobileNav = $("#mobile-nav");
    const setMenu = (open) => {
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
        mobileNav.classList.toggle("is-open", open);
    };
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    $$("a", mobileNav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
    });

    /* ---------- header + navegação ativa ---------- */
    const header = $("[data-header]");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const navLinks = $$("[data-nav]");
    const sectionObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) sectionObs.observe(s); });

    /* ---------- reveal + contadores ---------- */
    const countUp = (el) => {
        const target = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.dec || "0", 10);
        if (reduce) { el.textContent = fmt(target, dec); return; }
        const dur = 1400;
        const t0 = performance.now();
        const step = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(target * eased, dec);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            setTimeout(() => el.classList.add("is-in"), parseInt(el.dataset.delay || "0", 10));
            $$("[data-count]", el).forEach(countUp);
            revealObs.unobserve(el);
        });
    }, { threshold: 0.15 });
    // o HTML traz os valores finais (sem JS / crawlers); com animação, zera antes do count-up
    if (!reduce) $$("[data-count]").forEach((el) => { el.textContent = "0"; });
    $$("[data-reveal]").forEach((el) => revealObs.observe(el));

    /* ---------- toast ---------- */
    const toast = $("#toast");
    let toastTimer;
    const say = (msg) => {
        toast.textContent = msg;
        toast.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-on"), 1800);
    };

    /* ---------- filtros dos casos ---------- */
    const chips = $$(".chip");
    const applyFilter = (f, push) => {
        const chip = chips.find((c) => c.dataset.filter === f) || chips[0];
        f = chip.dataset.filter;
        chips.forEach((c) => { c.classList.toggle("is-on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
        $$("[data-tags]").forEach((c) => c.classList.toggle("is-hidden", f !== "all" && !c.dataset.tags.split(" ").includes(f)));
        // com filtro ativo, mostra também os problemas que ficam recolhidos
        const more = $("#inc-more");
        if (more && f !== "all") more.open = true;
        if (push) {
            const url = new URL(location.href);
            if (f === "all") url.searchParams.delete("stack"); else url.searchParams.set("stack", f);
            history.replaceState(null, "", url);
        }
    };
    chips.forEach((chip) => chip.addEventListener("click", () => {
        applyFilter(chip.dataset.filter, true);
        const n = $$(".case:not(.is-hidden)").length, k = $$(".inc:not(.is-hidden)").length;
        say(`${n} ${n === 1 ? "caso" : "casos"} · ${k} ${k === 1 ? "problema" : "problemas"}`);
    }));
    applyFilter(new URLSearchParams(location.search).get("stack") || "all", false);

    /* ---------- copiar ---------- */
    $$("[data-copy], [data-copy-text]").forEach((btn) => btn.addEventListener("click", async () => {
        const text = btn.dataset.copyText || $(btn.dataset.copy).textContent.trim();
        try { await navigator.clipboard.writeText(text); say("copiado ✓"); }
        catch (e) { say("não deu para copiar — selecione o texto"); }
    }));

    /* ---------- estrelas ao vivo (fallback = valores do HTML) ---------- */
    const repos = $$("[data-repo]");
    Promise.all(repos.map((card) =>
        fetch("https://api.github.com/repos/" + card.dataset.repo, { headers: { Accept: "application/vnd.github+json" } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                const el = $("[data-stars]", card);
                if (d && typeof d.stargazers_count === "number") el.textContent = d.stargazers_count;
                return parseInt(el.textContent, 10) || 0;
            })
            .catch(() => parseInt($("[data-stars]", card).textContent, 10) || 0)
    )).then((counts) => { $("#stars-total").textContent = counts.reduce((a, b) => a + b, 0); });

    /* ---------- dump hexadecimal do HID ---------- */
    const hexEl = $("#hex");
    const hexStatus = $("#hex-status");
    const frames = [
        { note: "→ get_firmware()", bytes: [0x06, 0x81, 0x00, 0x00], hot: [1] },
        { note: "← fw 1.10 · perfil 2", bytes: [0x06, 0x81, 0x01, 0x0a, 0x02], ack: true },
        { note: "→ set_dpi(stage=2, 1600)", bytes: [0x08, 0x07, 0x00, 0x00, 0x2c, 0x10, 0x01, 0x40, 0x06], hot: [1, 5, 6] },
        { note: "← ack 0x00", bytes: [0x08, 0x07, 0x00], ack: true },
        { note: "→ remap(L4 → A)", bytes: [0x06, 0x83, 0x0e, 0x01, 0x00, 0x04], hot: [2, 5] },
        { note: "← ack · verificado em 0,4 s", bytes: [0x06, 0x83, 0x00], ack: true },
        { note: "→ set_led(ring=1, #ffb547)", bytes: [0x06, 0x86, 0x01, 0xff, 0xb5, 0x47], hot: [3, 4, 5] },
        { note: "← ack 0x00", bytes: [0x06, 0x86, 0x00], ack: true },
        { note: "→ polling(1000 Hz)", bytes: [0x08, 0x01, 0x00, 0x00, 0x01, 0x01], hot: [5] },
        { note: "← ack · bateria 87%", bytes: [0x08, 0x01, 0x00, 0x57], ack: true }
    ];
    const hx = (n) => n.toString(16).padStart(2, "0");
    const line = (i, f) => {
        const padded = f.bytes.concat(Array(16 - f.bytes.length).fill(0));
        const body = padded.map((b, j) => {
            const s = hx(b);
            if (f.hot && f.hot.includes(j)) return `<span class="hot">${s}</span>`;
            if (f.ack && j < f.bytes.length) return `<span class="ack">${s}</span>`;
            return s;
        }).join(" ");
        return `<span class="off">${hx(i * 16).padStart(4, "0")}</span>  ${body}  <span class="off">${f.note}</span>`;
    };
    let hexI = 0;
    const lines = [];
    const tickHex = () => {
        const f = frames[hexI % frames.length];
        lines.push(line(hexI, f));
        if (lines.length > 5) lines.shift();
        hexEl.innerHTML = lines.join("\n");
        hexStatus.textContent = f.ack ? "ack ✓" : "enviando…";
        hexI++;
    };
    if (reduce) { for (let i = 0; i < 5; i++) tickHex(); hexStatus.textContent = "protocolo mapeado"; }
    const hexPause = $("#hex-pause");
    if (reduce) hexPause.hidden = true;
    else {
        let hexTimer = null, hexVisible = false, hexPaused = false;
        const syncHex = () => {
            const on = hexVisible && !hexPaused;
            if (on && !hexTimer) { tickHex(); hexTimer = setInterval(tickHex, 900); }
            else if (!on && hexTimer) { clearInterval(hexTimer); hexTimer = null; }
        };
        new IntersectionObserver(([e]) => { hexVisible = e.isIntersecting; syncHex(); }).observe(hexEl);
        hexPause.addEventListener("click", () => {
            hexPaused = !hexPaused;
            hexPause.textContent = hexPaused ? "continuar" : "pausar";
            hexPause.setAttribute("aria-pressed", String(hexPaused));
            if (hexPaused) hexStatus.textContent = "pausado";
            syncHex();
        });
    }

    /* ---------- fluxo do gateway (canvas) ---------- */
    const canvas = $("#flow");
    const ctx = canvas.getContext("2d");
    const doneEl = $("#flow-done");
    const rateEl = $("#flow-rate");
    const TOTAL = 9901;
    const LEASE = 0.8; // s até o lease de um worker morto expirar
    let W = 0, H = 0, dpr = 1, colors = {};
    let nodes = {};
    const dead = [false, false, false];

    const readColors = () => {
        colors = { amber: css("--mark-in"), cyan: css("--mark-ok"), text: css("--text"), faint: css("--faint"), line: css("--line-2"), panel: css("--panel-2"), bad: css("--red") || "#ff6b6b" };
    };
    const layout = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        W = r.width; H = r.height;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const x = (p) => p * W;
        const cy = H / 2;
        // nós encolhem em telas estreitas para caberem as 4 colunas
        const nw = Math.max(54, Math.min(92, W * 0.2));
        const small = W < 460;
        nodes = {
            nw, small,
            api: { x: nw / 2 + 16, y: cy, label: "API" },
            outbox: { x: x(0.37), y: cy, label: "outbox", sub: "SKIP LOCKED" },
            workers: [0, 1, 2].map((i) => ({ x: x(0.64), y: cy + (i - 1) * Math.min(78, H * 0.28), label: "worker " + (i + 1) })),
            wa: { x: W - nw / 2 - 16, y: cy, label: "WhatsApp" }
        };
    };

    const parts = [];
    // spawned = acked + em voo sempre; "perdidas" é essa conta, não um texto fixo
    let delivered = 0, spawnAcc = 0, last = 0, flashes = [], spawned = 0, acked = 0, releases = 0, holdUntil = 0;
    // shortcut: API aplica backpressure com 120 msgs na tela, só para o canvas não crescer sem limite
    const spawn = () => {
        if (parts.length >= 120) return;
        parts.push({ stage: 0, t: 0, w: -1, jitter: (Math.random() - 0.5) * 14, speed: 0.9 + Math.random() * 0.5 });
        spawned++;
    };
    const liveWorkers = () => dead.flatMap((d, i) => (d ? [] : [i]));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const put = (el, v) => { if (el.textContent !== v) el.textContent = v; };

    const drawNode = (n, accent, w = 84, h = 34) => {
        ctx.fillStyle = colors.panel;
        ctx.strokeStyle = accent || colors.line;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(n.x - w / 2, n.y - h / 2, w, h, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = colors.text;
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y + (n.sub ? -5 : 0));
        if (n.sub) { ctx.fillStyle = colors.faint; ctx.font = "9px 'JetBrains Mono', monospace"; ctx.fillText(n.sub, n.x, n.y + 8); }
    };
    const drawWire = (a, b) => {
        ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2;
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke(); ctx.setLineDash([]);
    };
    const bez = (a, b, t) => {
        const mx = (a.x + b.x) / 2;
        const p0 = a, p1 = { x: mx, y: a.y }, p2 = { x: mx, y: b.y }, p3 = b;
        const u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
        };
    };
    const dot = (x, y, color, alpha) => {
        ctx.fillStyle = color; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    };

    const frame = (now) => {
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        // ~15 msg/s visual (900/min), com pequenas oscilações
        spawnAcc += dt * (15 + Math.sin(now / 900) * 2.5);
        while (spawnAcc >= 1) { spawn(); spawnAcc -= 1; }
        const live = liveWorkers();

        ctx.clearRect(0, 0, W, H);
        drawWire(nodes.api, nodes.outbox);
        nodes.workers.forEach((w, k) => { ctx.globalAlpha = dead[k] ? 0.3 : 1; drawWire(nodes.outbox, w); drawWire(w, nodes.wa); });
        ctx.globalAlpha = 1;

        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            if (p.lease) {
                // worker morreu com a mensagem: fica travada até o lease expirar e volta ao outbox
                p.lease -= dt;
                if (p.lease > 0) { dot(p.x, p.y, colors.bad, 0.9); continue; }
                p.lease = 0; p.stage = 1; p.t = 0; p.w = -1;
            }
            p.t += dt * p.speed * (p.stage === 1 ? 2.2 : 1.6);
            if (p.stage === 1 && p.t >= 1) {
                // SKIP LOCKED: qualquer worker vivo pega; sem nenhum vivo, acumula no outbox
                if (live.length) p.w = live[(Math.random() * live.length) | 0];
                else p.t = 0.999;
            }
            const w = nodes.workers[p.w];
            let pos;
            if (p.stage === 0) pos = bez(nodes.api, nodes.outbox, ease(Math.min(1, p.t)));
            else if (p.stage === 1) pos = { x: nodes.outbox.x + Math.sin(p.t * 9 + i) * 3, y: nodes.outbox.y + p.jitter * 0.6 };
            else if (p.stage === 2) pos = bez(nodes.outbox, w, ease(Math.min(1, p.t)));
            else pos = bez(w, nodes.wa, ease(Math.min(1, p.t)));
            if (p.t >= 1) {
                p.t = 0; p.stage++;
                if (p.stage === 4) {
                    // ack: a partícula sai do array aqui e só aqui → entrega exatamente uma vez
                    parts.splice(i, 1);
                    acked++; delivered++;
                    flashes.push({ x: nodes.wa.x, y: nodes.wa.y, r: 4, a: 0.7 });
                    continue;
                }
            }
            p.x = pos.x; p.y = pos.y + (p.stage === 1 ? 0 : p.jitter * 0.15);
            dot(p.x, p.y, p.stage >= 3 ? colors.cyan : colors.amber, p.stage === 1 ? 0.55 : 0.95);
        }

        flashes = flashes.filter((f) => f.a > 0.02);
        flashes.forEach((f) => {
            ctx.strokeStyle = colors.cyan; ctx.globalAlpha = f.a; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
            f.r += dt * 60; f.a -= dt * 1.6;
        });
        ctx.globalAlpha = 1;

        const nw = nodes.nw;
        drawNode(nodes.api, null, nw, 34);
        drawNode(nodes.outbox, colors.amber, nw + 10, 40);
        nodes.workers.forEach((w, k) => { ctx.globalAlpha = dead[k] ? 0.5 : 1; drawNode(w, dead[k] ? colors.bad : null, nw, 34); });
        ctx.globalAlpha = 1;
        drawNode(nodes.wa, colors.cyan, nw, 34);

        if (!running) return;
        // contador avança 11 por entrega visual para chegar a 9.901 numa janela curta
        const shown = Math.min(TOTAL, delivered * 11);
        put(doneEl, fmt(shown));
        put(rateEl, fmt(Math.round(900 + Math.sin(now / 1300) * 14)));
        if (shown >= TOTAL && !holdUntil) holdUntil = now + 2500;
        if (holdUntil && now > holdUntil) { delivered = 0; holdUntil = 0; }
        raf = requestAnimationFrame(frame);
    };

    let running = false, raf = 0, flowVisible = false, flowPaused = false;
    const start = () => { if (running || reduce || flowPaused || !flowVisible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const staticFrame = () => {
        // sem animação: cena parada com os números finais (só workers vivos carregam mensagens)
        const live = liveWorkers();
        parts.length = 0;
        for (let i = 0; i < 40; i++) {
            const stage = live.length ? i % 4 : i % 2;
            parts.push({ stage, t: Math.random(), w: stage >= 2 ? live[i % live.length] : -1, jitter: (Math.random() - .5) * 14, speed: 1 });
        }
        spawned = parts.length; acked = 0;
        running = false; last = 0; frame(performance.now());
        put(doneEl, fmt(TOTAL)); put(rateEl, "900");
    };
    // parado (pausa, fora da tela, reduce): redesenha uma vez sem avançar o tempo
    const redraw = () => { if (running) return; if (reduce) staticFrame(); else { last = 0; frame(performance.now()); } };

    /* ---------- falha injetada: derrube um worker ---------- */
    const chaosEl = $("#flow-chaos");
    if (chaosEl) {
        chaosEl.innerHTML = '<span class="chaos-label mono">derrube um worker:</span>' +
            dead.map((_, k) => `<button type="button" class="chaos-btn" aria-pressed="false" data-worker="${k}">worker ${k + 1}</button>`).join("") +
            '<p class="chaos-log mono" aria-live="polite"></p>';
        const log = $(".chaos-log", chaosEl);
        const status = () => `perdidas: ${spawned - acked - parts.length} · duplicadas: 0 · re-lease: ${releases}`;
        log.textContent = status();
        $$(".chaos-btn", chaosEl).forEach((btn) => btn.addEventListener("click", () => {
            const k = +btn.dataset.worker;
            dead[k] = !dead[k];
            btn.setAttribute("aria-pressed", String(dead[k]));
            let ev = `worker ${k + 1} voltou`;
            if (dead[k]) {
                const held = parts.filter((p) => p.w === k && p.stage >= 2 && !p.lease);
                held.forEach((p) => { p.lease = LEASE; });
                releases += held.length;
                ev = `worker ${k + 1} caiu → ${held.length} ${held.length === 1 ? "mensagem voltou" : "mensagens voltaram"} ao outbox`;
            }
            redraw();
            log.textContent = ev + " · " + status();
        }));
    }

    readColors(); layout();
    // espera as fontes para o texto do canvas não piscar com a fonte de fallback
    const boot = () => {
        if (reduce) staticFrame();
        else new IntersectionObserver(([e]) => { flowVisible = e.isIntersecting; flowVisible ? start() : stop(); }, { threshold: 0.05 }).observe(canvas);
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(boot, boot);
    const flowPause = $("#flow-pause");
    if (reduce) flowPause.hidden = true;
    flowPause.addEventListener("click", () => {
        flowPaused = !flowPaused;
        flowPause.textContent = flowPaused ? "continuar" : "pausar";
        flowPause.setAttribute("aria-pressed", String(flowPaused));
        flowPaused ? stop() : start();
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    let resizeRaf = 0;
    window.addEventListener("resize", () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(() => { layout(); redraw(); }); });
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { syncTheme(); document.dispatchEvent(new Event("themechange")); });
    document.addEventListener("themechange", () => { readColors(); redraw(); });
})();

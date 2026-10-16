# Portfólio | Miguel Sanz

Portfólio pessoal de engenheiro de software back-end. Site estático em HTML, CSS e JavaScript puros: sem framework, sem build e sem dependência além das fontes do Google.

## Destaques

- **Gateway ao vivo**: canvas no hero que simula o gateway de mensageria (API → outbox `SKIP LOCKED` → workers → WhatsApp) com os números reais do teste de carga (900 msg/min, 9.901/9.901, p95 1,05 s). Dá para **derrubar um worker** e ver as mensagens voltarem ao outbox sem perda nem duplicação.
- **Números com recibo**: 4 métricas com fonte, link para o caso e evidência real (saída do k6, baseline do PHPStan, commit do roteador).
- **Casos**: problema → decisão → resultado, com resumo numérico e filtro por stack.
- **Open source**: os três configuradores Linux, estrelas lidas ao vivo da API do GitHub e um dump `/dev/hidraw` animado.
- Rodapé com peso da página e LCP medidos no navegador do visitante.
- **Efeitos** (`fx.js`, vindos do portfólio antigo e recoloridos): cena de partículas que muda de forma a cada seção ao rolar (</>, barras, aspas, { }, branches git, >_, @; ideia do portfólio do Humberto, refeita em canvas 2D), buraco negro em "Por que eu", esfera de partículas na stack, chama ASCII no contato, faíscas no clique, brilho do cursor e grade de pixels nos cards.
- Tema claro/escuro (respeita o sistema, contraste AA), responsivo, `prefers-reduced-motion`, animações pausadas fora da tela e card de preview (`assets/og.png`) para LinkedIn/WhatsApp.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Conteúdo |
| `style.css` | Design system (grafite + âmbar), layout e responsivo |
| `main.js` | Tema, menu, reveals, contadores, filtros, estrelas do GitHub, dump HID e canvas do gateway |
| `fx.js` | Efeitos visuais decorativos (canvas 2D, sem dependência) |
| `assets/` | Foto, currículo em PDF, screenshots dos apps, `og.png` (preview 1200×630) e `apple-touch-icon.png` |

## Rodar localmente

```bash
python3 -m http.server 8765
```

Abra http://127.0.0.1:8765.

## Publicar no GitHub Pages

1. Crie o repositório `MiguelSanzBr.github.io` (público) e envie estes arquivos para a branch `main`.
2. O site fica em https://miguelsanzbr.github.io/ (o repositório `flatpak` continua em `/flatpak/`).

Para atualizar o currículo, troque `assets/curriculo-miguel-sanz-boragan.pdf`.

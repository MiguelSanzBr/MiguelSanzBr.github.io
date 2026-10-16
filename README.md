# Portfólio | Miguel Sanz

Portfólio pessoal de engenheiro de software back-end. Site estático em HTML, CSS e JavaScript puros: sem framework, sem build e sem dependência além das fontes do Google.

## Destaques

- **Gateway ao vivo**: canvas no hero que simula o gateway de mensageria (API → outbox `SKIP LOCKED` → workers → WhatsApp) com os números reais do teste de carga (900 msg/min, 9.901/9.901, p95 1,05 s). Dá para **derrubar um worker** e ver as mensagens voltarem ao outbox sem perda nem duplicação.
- **Números com recibo**: 4 métricas com fonte, link para o caso e evidência real (saída do k6, baseline do PHPStan, commit do roteador).
- **Casos**: problema → decisão → resultado, com resumo numérico, filtro por stack e um registro de 11 problemas resolvidos (sintoma, causa raiz e correção).
- **Trajetória** com regime de cada vínculo e stack resumida; **recomendações** do LinkedIn, sem edição.
- **Open source**: os três configuradores Linux, estrelas lidas ao vivo da API do GitHub e um dump `/dev/hidraw` animado.
- Tema claro/escuro (respeita o sistema, contraste AA), responsivo, `prefers-reduced-motion`, animações pausadas fora da tela e card de preview (`assets/og.png`) para LinkedIn/WhatsApp.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Conteúdo |
| `style.css` | Design system (grafite + âmbar), layout e responsivo |
| `main.js` | Tema, menu, reveals, contadores, filtros, estrelas do GitHub, dump HID e canvas do gateway |
| `assets/` | Foto, currículo em PDF, screenshots dos apps, `og.png` (preview 1200×630) e `apple-touch-icon.png` |

## Rodar localmente

```bash
python3 -m http.server 8765
```

Abra http://127.0.0.1:8765.

## Publicar no GitHub Pages

O repositório `MiguelSanzBr/MiguelSanzBr.github.io` publica a branch `main`: cada push atualiza https://miguelsanzbr.github.io/ em cerca de 1 minuto. O repositório `flatpak` continua em `/flatpak/`.

Para atualizar o currículo, troque `assets/curriculo-miguel-sanz-boragan.pdf`.

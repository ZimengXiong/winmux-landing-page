import { Marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import './style.css';
import rawMarkdown from './index.md?raw';

let isFirstMediaBlock = true;

const marked = new Marked({
  gfm: true,
  breaks: true,
});

marked.use({
  renderer: {
    // Show literal hash tags for headings instead of HTML heading elements
    heading({ text, depth }) {
      const hashes = '#'.repeat(depth);
      return `<p class="heading-line heading-depth-${depth}">${hashes} ${text}</p>\n`;
    },
    // Keep emphasis / italics as plain upright text (no WYSIWYG italics)
    em({ text }) {
      return text;
    },
    code({ text, lang }) {
      const validLang = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = validLang
        ? hljs.highlight(text, { language: validLang }).value
        : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs ${validLang ? 'language-' + validLang : ''}">${highlighted}</code></pre>\n`;
    },
    image({ href, text, title }) {
      const isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(href);
      const titleAttr = title ? ` title="${title}"` : '';
      const caption = text || title || '';
      const captionHtml = caption ? `<figcaption class="media-caption">${caption}</figcaption>` : '';

      if (isVideo) {
        return `
          <figure class="media-block">
            <video controls muted playsinline preload="metadata" src="${href}"${titleAttr} class="media-video">
              Your browser does not support the video tag.
            </video>
            ${captionHtml}
          </figure>
        `;
      }

      if (captionHtml) {
        return `
          <figure class="media-block">
            <img src="${href}" alt="${text || ''}"${titleAttr} class="media-image" loading="lazy" />
            ${captionHtml}
          </figure>
        `;
      }

      return `<img src="${href}" alt="${text || ''}"${titleAttr} class="media-image" loading="lazy" />`;
    },
    table(header, body) {
      return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
    },
    paragraph(token) {
      const meaningfulTokens = token.tokens.filter(t => t.type !== 'text' || t.text.trim() !== '');
      const isAllImages = meaningfulTokens.length > 1 && meaningfulTokens.every(t => t.type === 'image');

      if (isAllImages) {
        // Special hover cross-fade for the very first 2-image block with top-right overlay badge
        if (isFirstMediaBlock && meaningfulTokens.length === 2) {
          isFirstMediaBlock = false;
          const img1 = meaningfulTokens[0];
          const img2 = meaningfulTokens[1];
          const caption = img1.text || img2.text || '';
          const captionHtml = caption ? `<figcaption class="media-caption">${caption}</figcaption>` : '';

          return `
            <figure class="media-crossfade">
              <div class="crossfade-badge">hover me</div>
              <img src="${img1.href}" alt="${img1.text || ''}" class="crossfade-base" />
              <img src="${img2.href}" alt="${img2.text || ''}" class="crossfade-hover" />
              ${captionHtml}
            </figure>\n
          `;
        }

        isFirstMediaBlock = false;
        const renderedImages = meaningfulTokens.map(t => this.parser.parseInline([t])).join('');
        return `<div class="media-row">${renderedImages}</div>\n`;
      }

      if (meaningfulTokens.some(t => t.type === 'image')) {
        isFirstMediaBlock = false;
      }

      const parsed = this.parser.parseInline(token.tokens);
      if (parsed.trim().startsWith('<figure') && parsed.trim().endsWith('</figure>')) {
        return parsed + '\n';
      }
      if (parsed.trim() === '~*~') {
        return `<p class="section-divider">~*~</p>\n`;
      }
      return `<p>${parsed}</p>\n`;
    }
  }
});

function renderMarkdown(md) {
  isFirstMediaBlock = true;
  const container = document.getElementById('markdown-app');
  if (container) {
    container.innerHTML = marked.parse(md);
  }
}

// Autoplay video on /esas
function triggerEsasAutoplay() {
  const esasVideo = document.getElementById('esas-video');
  if (!esasVideo) return;

  setTimeout(() => {
    esasVideo.muted = true;
    const playPromise = esasVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }, 100);
}

// Router for /, /sas, /esas
function initRouter() {
  const viewEssay = document.getElementById('view-essay');
  const viewSas = document.getElementById('view-sas');
  const viewEsas = document.getElementById('view-esas');
  const navSasLink = document.getElementById('nav-sas-link');

  function updateRoute(pathname, pushState = true) {
    const isEsas = pathname.includes('/esas') || window.location.hash === '#esas';
    const isSas = !isEsas && (pathname.includes('/sas') || window.location.hash === '#sas');

    if (viewEssay) viewEssay.style.display = (!isSas && !isEsas) ? 'block' : 'none';
    if (viewSas) viewSas.style.display = isSas ? 'block' : 'none';
    if (viewEsas) viewEsas.style.display = isEsas ? 'block' : 'none';
    if (navSasLink) navSasLink.style.display = (!isSas && !isEsas) ? 'inline-flex' : 'none';

    window.scrollTo(0, 0);

    if (isEsas) {
      triggerEsasAutoplay();
    }

    if (pushState) {
      const targetUrl = isEsas ? '/esas' : (isSas ? '/sas' : '/');
      window.history.pushState({}, '', targetUrl);
    }
  }

  // Intercept all internal navigation links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (href && (href === '/' || href === '/sas' || href === '/esas')) {
      e.preventDefault();
      updateRoute(href);
    }
  });

  window.addEventListener('popstate', () => {
    updateRoute(window.location.pathname, false);
  });

  // Initial route check
  updateRoute(window.location.pathname, false);
}

// Universal Video Controller
function attachVideoControls(prefix) {
  const video = document.getElementById(`${prefix}-video`);
  const playOverlay = document.getElementById(`${prefix}-play-overlay`);
  const toggleBtn = document.getElementById(`${prefix}-toggle-play`);
  const iconPlay = document.getElementById(`${prefix}-icon-play`);
  const iconPause = document.getElementById(`${prefix}-icon-pause`);
  const progressTrack = document.getElementById(`${prefix}-progress-track`);
  const progressFill = document.getElementById(`${prefix}-progress-fill`);
  const timeDisplay = document.getElementById(`${prefix}-time-display`);
  const fullscreenBtn = document.getElementById(`${prefix}-fullscreen`);

  if (!video) return;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updatePlayState() {
    if (video.paused) {
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      if (playOverlay) playOverlay.classList.remove('hidden');
    } else {
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconPause) iconPause.style.display = 'block';
      if (playOverlay) playOverlay.classList.add('hidden');
    }
  }

  function togglePlay() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  if (playOverlay) playOverlay.addEventListener('click', togglePlay);
  if (toggleBtn) toggleBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', updatePlayState);
  video.addEventListener('pause', updatePlayState);

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
  });

  video.addEventListener('loadedmetadata', () => {
    if (timeDisplay && video.duration) {
      timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
    }
  });

  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, clickX / rect.width));
      if (video.duration) {
        video.currentTime = fraction * video.duration;
      }
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      }
    });
  }
}

// Initial setup
renderMarkdown(rawMarkdown);
initRouter();
attachVideoControls('sas');
attachVideoControls('esas');

// Vite HMR
if (import.meta.hot) {
  import.meta.hot.accept('./index.md?raw', (newModule) => {
    if (newModule && newModule.default) {
      renderMarkdown(newModule.default);
    }
  });
}

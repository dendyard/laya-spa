import { getSlides } from '../api/content.js'
import { initJXPlayer, pauseAll, getPlayer } from '../components/JXPlayer.js'
import { initMusicPlayer, registerMusicButtons, playMusic, pauseMusic, toggleMusic } from '../components/MusicPlayer.js'
import { initReaderIntro, showIntro, dismissIntro } from '../components/ReaderIntro.js'

let readerLazyObserver = null

export async function renderReaderView(container, { onClose }) {
  const slides = await getSlides(1)

  container.innerHTML = ''

  // Audio
  const audio = document.createElement('audio')
  audio.id = 'bgMusic'
  audio.src = '/assets/Moss Canopy.mp3'
  audio.loop = true
  audio.preload = 'auto'
  container.appendChild(audio)

  // Intro overlay
  const overlay = document.createElement('div')
  overlay.className = 'reader-intro-overlay'
  overlay.id = 'readerIntroOverlay'
  overlay.innerHTML = `
    <img src="/assets/laya-logo-gram.png" alt="Laya" class="reader-intro-logo" />
    <div class="reader-intro-spinner"></div>
  `
  container.appendChild(overlay)

  // Main reader
  const main = document.createElement('main')
  main.className = 'reels-reader'
  main.setAttribute('aria-label', 'Tato Dayak reader')

  const slidesHTML = slides.map((slide, i) => {
    const isFirst = i === 0
    const contentHTML = slide.content.map(block => {
      if (block.type === 'h1') return `<h1>${block.text}</h1>`
      return `<p>${block.text}</p>`
    }).join('')

    return `
      <section class="reel-slide reel-slide--${numberToWord(i + 1)}" aria-label="Halaman ${i + 1} dari ${slides.length}">
        <div id="videocontainer-${i + 1}" class="jx-player-container" data-jx-video-id="${slide.videoId}"></div>
        <div class="reel-top">
          <button class="music-btn" type="button" aria-label="Play/Pause musik">
            <span class="music-bars"><span></span><span></span><span></span><span></span></span>
          </button>
          <a href="#" class="reel-close-btn" aria-label="Tutup">
            <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M72 72l112 112M184 72 72 184"/></svg>
          </a>
        </div>
        <article class="reel-copy">
          <button class="reel-sheet-handle" type="button" aria-label="Atur panel"></button>
          ${contentHTML}
          <div class="reel-page-chip"><i aria-hidden="true"></i> Halaman ${i + 1}/${slides.length}</div>
        </article>
        ${isFirst ? `
          <div class="reel-reader-helper" role="button" tabindex="0" aria-label="Tutup bantuan membaca">
            <div>
              <img src="/assets/click-1.svg" alt="" aria-hidden="true" />
              <span>Klik area text untuk melihat semua paragraf</span>
            </div>
          </div>
        ` : ''}
      </section>
    `
  }).join('')

  main.innerHTML = slidesHTML
  container.appendChild(main)

  // Init components
  initMusicPlayer(audio)
  initReaderIntro(overlay, container)
  registerMusicButtons(container.querySelectorAll('.music-btn'))

  // Music toggle and close
  container.addEventListener('click', e => {
    if (e.target.closest('.music-btn')) toggleMusic()
    if (e.target.closest('.reel-close-btn')) {
      e.preventDefault()
      onClose()
    }
  })

  // JX lazy load
  setupLazyLoad(main, () => dismissIntro())

  return { slides }
}

export function activateReaderView(container) {
  const main = container.querySelector('.reels-reader')
  if (main) main.scrollTop = 0
  showIntro()
  playMusic()
  setupLazyLoad(main, () => dismissIntro())
}

export function deactivateReaderView() {
  pauseAll()
  pauseMusic()
}

function setupLazyLoad(reelsReader, onFirstVideoStart) {
  if (readerLazyObserver) readerLazyObserver.disconnect()

  readerLazyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const slide = entry.target
      if (entry.isIntersecting) {
        loadSlideMedia(slide, onFirstVideoStart)
      } else {
        unloadSlideMedia(slide)
      }
    })
  }, { root: reelsReader, threshold: 0 })

  reelsReader?.querySelectorAll('.reel-slide').forEach(slide => {
    if (slide.querySelector('.jx-player-container')) {
      slide.classList.add('is-video-loading')
      readerLazyObserver.observe(slide)
    }
  })
}

function loadSlideMedia(slide, onFirstVideoStart) {
  const container = slide.querySelector('.jx-player-container')
  if (!container) return

  const existing = getPlayer(slide)
  if (existing) {
    try { existing.play() } catch {}
    return
  }

  initJXPlayer(slide, container, {
    onStart: () => onFirstVideoStart?.(),
  })
}

function unloadSlideMedia(slide) {
  const container = slide.querySelector('.jx-player-container')
  if (!container) return
  const p = getPlayer(slide)
  if (p) { try { p.pause() } catch {} }
}

function numberToWord(n) {
  const words = ['one','two','three','four','five','six','seven','eight','nine']
  return words[n - 1] || n
}

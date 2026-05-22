// ---- NAVIGATION ----
var viewToPage = {
  'view-index':  'home',
  'view-detail': 'detail',
  'view-reader': 'read'
};
var pageToView = {
  'home':   'view-index',
  'detail': 'view-detail',
  'read':   'view-reader'
};

// ---- BACKGROUND MUSIC ----
var bgMusic = document.getElementById('bgMusic');
var musicBtns = document.querySelectorAll('.music-btn');

function setMusicPlaying(playing) {
  musicBtns.forEach(function(btn) {
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-label', playing ? 'Pause musik' : 'Play musik');
  });
}

bgMusic.addEventListener('play', function() { setMusicPlaying(true); });
bgMusic.addEventListener('pause', function() { setMusicPlaying(false); });

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.music-btn');
  if (!btn) return;
  if (bgMusic.paused) {
    bgMusic.play().catch(function() {});
  } else {
    bgMusic.pause();
  }
});

function showView(id, pushState) {
  document.querySelectorAll('.view').forEach(function(v) {
    v.classList.remove('is-active');
  });
  document.querySelectorAll('#view-reader video').forEach(function(v) { v.pause(); });
  jxPlayers.forEach(function(p) { try { p.pause(); } catch(e) {} });

  if (id !== 'view-reader') {
    bgMusic.pause();
  }

  var target = document.getElementById(id);
  target.classList.add('is-active');
  if (id !== 'view-reader') {
    window.scrollTo(0, 0);
  } else {
    var reader = target.querySelector('.reels-reader');
    if (reader) reader.scrollTop = 0;
    bgMusic.play().catch(function() {});
    setupReaderLazyLoad();
  }

  if (pushState !== false) {
    var page = viewToPage[id] || 'home';
    history.pushState({ page: page }, '', '?page=' + page);
  }
}

window.addEventListener('popstate', function(e) {
  var page = (e.state && e.state.page) || 'home';
  var id = pageToView[page] || 'view-index';
  showView(id, false);
});


// Wire up all [data-goto] anchors and cards
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-goto]');
  if (el) {
    e.preventDefault();
    showView(el.dataset.goto);
  }
  var closeBtn = e.target.closest('.reel-close-btn');
  if (closeBtn) {
    e.preventDefault();
    showView('view-detail');
  }
});

// Keyboard navigation for original-card
document.querySelectorAll('.original-card[data-goto]').forEach(function(card) {
  card.setAttribute('role', 'link');
  card.setAttribute('tabindex', '0');
  card.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showView(card.dataset.goto);
    }
  });
});

// ---- DETAIL PAGE: TABS ----
var originalPage = document.querySelector('.original-detail-page');
var originalTabs = document.querySelectorAll('[data-original-tab]');

originalTabs.forEach(function(tab) {
  tab.addEventListener('click', function(event) {
    event.preventDefault();
    originalTabs.forEach(function(item) { item.classList.remove('is-active'); });
    tab.classList.add('is-active');
    originalPage.classList.toggle('is-description-mode', tab.dataset.originalTab === 'description');
  });
});

// ---- DETAIL PAGE: PREMIUM BLOCKER ----
var premiumBlocker = document.querySelector('.premium-blocker');
var premiumBlockerClose = document.querySelector('.premium-blocker__close');
var premiumBlockerBackdrop = document.querySelector('.premium-blocker__backdrop');

function openPremiumBlocker() {
  premiumBlocker.classList.add('is-open');
  premiumBlocker.setAttribute('aria-hidden', 'false');
}
function closePremiumBlocker() {
  premiumBlocker.classList.remove('is-open');
  premiumBlocker.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.original-episode-list .is-locked').forEach(function(episode) {
  episode.setAttribute('role', 'button');
  episode.setAttribute('tabindex', '0');
  episode.addEventListener('click', openPremiumBlocker);
  episode.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPremiumBlocker();
    }
  });
});

premiumBlockerClose.addEventListener('click', closePremiumBlocker);
premiumBlockerBackdrop.addEventListener('click', closePremiumBlocker);
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && premiumBlocker.classList.contains('is-open')) {
    closePremiumBlocker();
  }
});

// YouTube API removed — semua slide kini menggunakan JX Player
var ytPlayers = new WeakMap(); // dipertahankan agar unloadSlideMedia tidak error

// ---- JX PLAYER ----
var jxPlayers = new Map();

function initJxPlayer(slide, container) {
  if (typeof JX === 'undefined') return;
  var p = JX.player({
    accountid: "9262bf2590d558736cac4fff7978fcb1",
    container: container.id,
    customid: "vertikal-video-" + container.id,
    autoplay: "always",
    sound: "off",
    headless: true,
    jsonld: false,
    cust_params: "cf981644373527756b1379"
  });
  p.loadVideoById(parseInt(container.dataset.jxVideoId, 10));
  p.addEventListener('video_start', function() {
    slide.classList.remove('is-video-loading');
  });
  var videoId = parseInt(container.dataset.jxVideoId, 10);
  p.addEventListener('ended', function() {
    try {
      p.loadVideoById(videoId);
    } catch(e) {
      p.play();
    }
  });
  window.setTimeout(function() {
    slide.classList.remove('is-video-loading');
  }, 5000); // fallback jika event video_start tidak terpicu
  jxPlayers.set(slide, p);
}

// ---- READER: LAZY LOAD ----
// Store each slide's media blueprint before removing from DOM
var mediaTemplates = new Map();

document.querySelectorAll('.reel-slide').forEach(function(slide) {
  var media = slide.querySelector('video[data-src], iframe[data-src]');
  if (!media) return;

  var attrs = {};
  Array.from(media.attributes).forEach(function(a) {
    if (a.name !== 'data-src') attrs[a.name] = a.value;
  });

  mediaTemplates.set(slide, {
    type: media.tagName.toLowerCase(),
    src: media.dataset.src,
    attrs: attrs
  });

  media.remove();
  slide.classList.add('is-video-loading');
});

// Tandai slide JX Player sebagai loading
document.querySelectorAll('.jx-player-container').forEach(function(container) {
  var slide = container.closest('.reel-slide');
  if (slide) slide.classList.add('is-video-loading');
});

function loadSlideMedia(slide) {
  // JX Player
  var jxContainer = slide.querySelector('.jx-player-container');
  if (jxContainer) {
    var existing = jxPlayers.get(slide);
    if (existing) {
      try { existing.play(); } catch(e) {}
    } else {
      initJxPlayer(slide, jxContainer);
    }
    return;
  }

  if (slide.querySelector('video, iframe')) return; // already present

  var tpl = mediaTemplates.get(slide);
  if (!tpl) return;

  var el = document.createElement(tpl.type);
  Object.keys(tpl.attrs).forEach(function(k) { el.setAttribute(k, tpl.attrs[k]); });
  el.src = tpl.src;

  function markReady() { slide.classList.remove('is-video-loading'); }

  if (tpl.type === 'video') {
    el.addEventListener('canplay', markReady, { once: true });
    el.addEventListener('loadeddata', markReady, { once: true });
    slide.insertBefore(el, slide.firstChild);
    el.load();
    el.play().catch(function() {});
  } else {
    var isYouTube = tpl.src.indexOf('youtube') !== -1;
    slide.insertBefore(el, slide.firstChild);
    if (isYouTube) {
      attachYouTubePlayer(el, slide, markReady);
      window.setTimeout(markReady, 6000); // fallback if API unreachable
    } else {
      el.addEventListener('load', markReady, { once: true });
      window.setTimeout(markReady, 2000);
    }
  }
}

function unloadSlideMedia(slide) {
  // JX Player — cukup pause, jangan destroy agar bisa resume
  var jxContainer = slide.querySelector('.jx-player-container');
  if (jxContainer) {
    var jxPlayer = jxPlayers.get(slide);
    if (jxPlayer) {
      try { jxPlayer.pause(); } catch(e) {}
    }
    return;
  }

  var player = ytPlayers.get(slide);
  if (player) {
    try { player.destroy(); } catch(e) {}
    ytPlayers.delete(slide);
    slide.classList.add('is-video-loading');
    return;
  }
  var el = slide.querySelector('video, iframe');
  if (!el) return;
  if (el.tagName === 'VIDEO') { el.pause(); el.removeAttribute('src'); el.load(); }
  el.remove();
  slide.classList.add('is-video-loading');
}

var readerLazyObserver = null;

function setupReaderLazyLoad() {
  if (readerLazyObserver) readerLazyObserver.disconnect();

  var reelsReader = document.querySelector('.reels-reader');

  readerLazyObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        loadSlideMedia(entry.target);
      } else {
        unloadSlideMedia(entry.target);
      }
    });
  }, { root: reelsReader, threshold: 0 });

  document.querySelectorAll('.reel-slide').forEach(function(slide) {
    if (mediaTemplates.has(slide) || slide.querySelector('.jx-player-container')) {
      readerLazyObserver.observe(slide);
    }
  });
}

// ---- READER: GESTURE & SCROLL INTERACTIONS ----
// reader-experiment-b mode is always active (part=3)
var isReaderExperiment = true;

document.querySelectorAll('.reel-copy').forEach(function(copy) {
  var slideRoot = copy.closest('.reel-slide');
  var handle = copy.querySelector('.reel-sheet-handle');
  var helper = slideRoot.querySelector('.reel-reader-helper');
  var isFirstSlide = slideRoot === document.querySelector('.reel-slide');

  var nextHelper = isFirstSlide && !isReaderExperiment ? document.createElement('div') : null;
  var touchStartY = 0;
  var touchMoved = false;
  var normalTouchStartY = 0;
  var normalTouchShouldAdvance = false;
  var contentTouchStartY = 0;
  var contentTouchMoved = false;
  var contentTouchIsSheetGesture = false;
  var contentTouchShouldAdvance = false;
  var contentPointerActive = false;
  var experimentSheetNextReady = false;
  var nextHelperTouchStartY = 0;
  var nextHelperWasShown = false;

  if (nextHelper) {
    nextHelper.className = 'reel-next-helper';
    nextHelper.setAttribute('role', 'button');
    nextHelper.setAttribute('tabindex', '0');
    nextHelper.setAttribute('aria-label', 'Lanjut ke halaman berikutnya');
    nextHelper.innerHTML =
      '<div>' +
      '<img src="assets/scroll-up.svg" alt="" aria-hidden="true" />' +
      '<span>Geser ke atas untuk melihat halaman selanjutnya</span>' +
      '</div>';
    slideRoot.appendChild(nextHelper);
  }

  function hideHelper() {
    if (!helper) return;
    helper.classList.add('is-hidden');
  }

  function showNextHelper(slide) {
    if (
      isFirstSlide && !isReaderExperiment && !nextHelperWasShown &&
      slide.classList.contains('is-expanded') &&
      slide.nextElementSibling && slide.nextElementSibling.classList.contains('reel-slide')
    ) {
      nextHelperWasShown = true;
      slide.classList.add('is-next-helper-visible');
    }
  }

  function hideNextHelper(slide) {
    slide.classList.remove('is-next-helper-visible');
  }

  helper && helper.addEventListener('click', hideHelper);
  helper && helper.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hideHelper();
    }
  });

  function openSheet(slide) {
    hideHelper();
    hideNextHelper(slide);
    resetSheetDrag(slide);
    slide.classList.add('is-expanded');
    slide.classList.remove('is-sheet-full', 'is-closing');
    window.setTimeout(function() {
      if (slide.classList.contains('is-expanded') && isCopyAtBottom()) {
        showNextHelper(slide);
      }
    }, 360);
  }

  function closeSheet(slide, animated) {
    hideNextHelper(slide);
    resetSheetDrag(slide);
    experimentSheetNextReady = false;
    if (animated && slide.classList.contains('is-expanded')) {
      slide.classList.add('is-closing');
      window.setTimeout(function() {
        slide.classList.remove('is-expanded', 'is-sheet-full', 'is-closing');
      }, 220);
      return;
    }
    slide.classList.remove('is-expanded', 'is-sheet-full', 'is-closing');
  }

  slideRoot.addEventListener('click', function(event) {
    if (!isReaderExperiment) return;
    if (!slideRoot.classList.contains('is-expanded')) return;
    if (copy.contains(event.target)) return;
    closeSheet(slideRoot, true);
  });

  function resetSheetDrag(slide) {
    slide.classList.remove('is-dragging');
    slide.style.removeProperty('--reel-sheet-down');
    slide.style.removeProperty('--reel-video-extra');
  }

  function syncSheetDrag(slide, deltaY) {
    var dragDown = Math.min(Math.max(deltaY / 220, 0), 1);
    slide.classList.add('is-dragging');
    slide.style.setProperty('--reel-sheet-down', Math.round(dragDown * 84) + 'px');
    slide.style.setProperty('--reel-video-extra', Math.round(dragDown * 84) + 'px');
  }

  function isCopyAtBottom() {
    return copy.scrollHeight - copy.scrollTop - copy.clientHeight <= 72;
  }

  function isCopyScrollable() {
    return copy.scrollHeight > copy.clientHeight + 72;
  }

  function shouldGoNextOnSwipeUp() {
    return !isCopyScrollable() || isCopyAtBottom();
  }

  function goToNextSlide(slide) {
    var nextSlide = slide.nextElementSibling;
    if (!nextSlide || !nextSlide.classList.contains('reel-slide')) return;
    hideNextHelper(slide);
    closeSheet(slide);
    experimentSheetNextReady = false;
    nextSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncNextHelper() {
    var slide = copy.closest('.reel-slide');
    if (slide.classList.contains('is-next-helper-visible')) return;
    if (!isFirstSlide || nextHelperWasShown) return;
    if (slide.classList.contains('is-expanded') && isCopyAtBottom()) {
      showNextHelper(slide);
    }
  }

  nextHelper && nextHelper.addEventListener('click', function() { hideNextHelper(slideRoot); });
  nextHelper && nextHelper.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hideNextHelper(slideRoot);
    }
  });
  nextHelper && nextHelper.addEventListener('touchstart', function(event) {
    nextHelperTouchStartY = event.touches[0].clientY;
  }, { passive: true });
  nextHelper && nextHelper.addEventListener('touchmove', function(event) {
    var deltaY = event.touches[0].clientY - nextHelperTouchStartY;
    if (Math.abs(deltaY) > 8) { hideNextHelper(slideRoot); }
  }, { passive: true });
  nextHelper && nextHelper.addEventListener('touchend', function(event) {
    var deltaY = event.changedTouches[0].clientY - nextHelperTouchStartY;
    if (deltaY < -42) {
      hideNextHelper(slideRoot);
      goToNextSlide(slideRoot);
    }
  });

  copy.addEventListener('click', function() {
    var slide = copy.closest('.reel-slide');
    if (!slide.classList.contains('is-expanded')) {
      openSheet(slide);
    }
  });

  copy.addEventListener('touchstart', function(event) {
    if (event.target === handle) return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      normalTouchStartY = event.touches[0].clientY;
      normalTouchShouldAdvance = shouldGoNextOnSwipeUp();
      return;
    }
    if (!slide.classList.contains('is-expanded')) return;
    startContentGesture(event.touches[0].clientY);
  }, { passive: true });

  copy.addEventListener('touchmove', function(event) {
    if (event.target === handle) return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      var deltaY = event.touches[0].clientY - normalTouchStartY;
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (event.cancelable) event.preventDefault();
      }
      return;
    }
    moveContentGesture(event.touches[0].clientY, event);
  }, { passive: false });

  copy.addEventListener('touchend', function(event) {
    if (event.target === handle) return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      var deltaY = event.changedTouches[0].clientY - normalTouchStartY;
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (isCopyScrollable() && !experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        goToNextSlide(slide);
      }
      return;
    }
    endContentGesture(event.changedTouches[0].clientY);
  });

  copy.addEventListener('pointerdown', function(event) {
    if (event.pointerType === 'touch' || event.target === handle) return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      contentPointerActive = true;
      normalTouchStartY = event.clientY;
      normalTouchShouldAdvance = shouldGoNextOnSwipeUp();
      copy.setPointerCapture && copy.setPointerCapture(event.pointerId);
      return;
    }
    if (!slide.classList.contains('is-expanded')) return;
    contentPointerActive = true;
    copy.setPointerCapture && copy.setPointerCapture(event.pointerId);
    startContentGesture(event.clientY);
  });

  copy.addEventListener('pointermove', function(event) {
    if (!contentPointerActive || event.pointerType === 'touch') return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      var deltaY = event.clientY - normalTouchStartY;
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (event.cancelable) event.preventDefault();
      }
      return;
    }
    moveContentGesture(event.clientY, event);
  });

  copy.addEventListener('pointerup', function(event) {
    if (!contentPointerActive || event.pointerType === 'touch') return;
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      var deltaY = event.clientY - normalTouchStartY;
      contentPointerActive = false;
      copy.releasePointerCapture && copy.releasePointerCapture(event.pointerId);
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (isCopyScrollable() && !experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        goToNextSlide(slide);
      }
      return;
    }
    contentPointerActive = false;
    copy.releasePointerCapture && copy.releasePointerCapture(event.pointerId);
    endContentGesture(event.clientY);
  });

  copy.addEventListener('pointercancel', function(event) {
    if (event.pointerType === 'touch') return;
    contentPointerActive = false;
    resetSheetDrag(copy.closest('.reel-slide'));
  });

  function startContentGesture(clientY) {
    contentTouchStartY = clientY;
    contentTouchShouldAdvance = shouldGoNextOnSwipeUp();
    contentTouchMoved = false;
    contentTouchIsSheetGesture = false;
  }

  function moveContentGesture(clientY, event) {
    var slide = copy.closest('.reel-slide');
    if (!slide.classList.contains('is-expanded')) return;
    var deltaY = clientY - contentTouchStartY;
    if (Math.abs(deltaY) <= 8 && !contentTouchMoved) return;
    if (isReaderExperiment) {
      contentTouchMoved = true;
      if (!shouldGoNextOnSwipeUp()) { experimentSheetNextReady = false; }
      if (deltaY < -48 && (contentTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (event.cancelable) event.preventDefault();
      }
      return;
    }
    if (deltaY < 0 && contentTouchShouldAdvance) {
      contentTouchMoved = true;
      contentTouchIsSheetGesture = true;
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (deltaY < 0) return;
    contentTouchMoved = true;
    contentTouchIsSheetGesture = true;
    syncSheetDrag(slide, deltaY);
    if (event.cancelable) event.preventDefault();
  }

  function endContentGesture(clientY) {
    var slide = copy.closest('.reel-slide');
    if (!slide.classList.contains('is-expanded')) return;
    var deltaY = clientY - contentTouchStartY;
    if (isReaderExperiment) {
      if (deltaY < -48 && (contentTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (!experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        goToNextSlide(slide);
      }
      return;
    }
    if (deltaY < -48 && contentTouchShouldAdvance) {
      goToNextSlide(slide);
      return;
    }
    if (contentTouchIsSheetGesture) {
      if (deltaY > 48) { closeSheet(slide, true); return; }
      resetSheetDrag(slide);
      return;
    }
    if (deltaY < -48 && contentTouchShouldAdvance) {
      showNextHelper(slide);
    }
  }

  copy.addEventListener('scroll', function() {
    if (!isCopyAtBottom()) experimentSheetNextReady = false;
    syncNextHelper();
  }, { passive: true });

  copy.addEventListener('wheel', function(event) {
    var slide = copy.closest('.reel-slide');
    if (isReaderExperiment && !slide.classList.contains('is-expanded')) {
      if (event.deltaY > 0 && shouldGoNextOnSwipeUp()) {
        event.preventDefault();
        if (isCopyScrollable() && !experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        goToNextSlide(slide);
      } else if (event.deltaY < 0) {
        experimentSheetNextReady = false;
      }
      return;
    }
    if (!slide.classList.contains('is-expanded')) return;
    if (event.deltaY > 0 && shouldGoNextOnSwipeUp()) {
      event.preventDefault();
      if (isReaderExperiment && !experimentSheetNextReady) {
        experimentSheetNextReady = true;
        return;
      }
      if (isReaderExperiment || !isFirstSlide || nextHelperWasShown) {
        goToNextSlide(slide);
        return;
      }
      showNextHelper(slide);
    } else if (isReaderExperiment) {
      experimentSheetNextReady = false;
    }
  }, { passive: false });

  handle && handle.addEventListener('touchstart', function(event) {
    touchStartY = event.touches[0].clientY;
    touchMoved = false;
  }, { passive: true });

  handle && handle.addEventListener('touchmove', function(event) {
    var deltaY = event.touches[0].clientY - touchStartY;
    if (Math.abs(deltaY) > 8) touchMoved = true;
    var slide = copy.closest('.reel-slide');
    if (event.cancelable && slide.classList.contains('is-expanded')) {
      event.preventDefault();
    }
  }, { passive: false });

  handle && handle.addEventListener('touchend', function(event) {
    if (!touchMoved) return;
    var slide = copy.closest('.reel-slide');
    var deltaY = event.changedTouches[0].clientY - touchStartY;
    if (!slide.classList.contains('is-expanded')) return;
    if (deltaY > 48) { closeSheet(slide, true); }
  });
});

// ---- INITIAL PAGE RESTORE ----
// Runs last so mediaTemplates and all listeners are ready
(function() {
  var params = new URLSearchParams(window.location.search);
  var page = params.get('page') || 'home';
  var id = pageToView[page] || 'view-index';
  history.replaceState({ page: page }, '', '?page=' + page);
  if (page !== 'home') showView(id, false);
}());

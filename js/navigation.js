/* ================================================
   navigation.js — 侨批数字展馆 · 翻页引擎（JS翻页版）
   ================================================ */

const AUTO_ADVANCE_CONFIG = {
  enabled: true,
  defaultDelay: 12000,
  perZoneOverrides: {
    1: { enabled: false },
    2: { enabled: false },
    3: { delay: 6000 },
    4: { delay: 10000 },
    10: { enabled: false },
    12: { delay: 15000 }
  }
};

const STATE = {
  currentZone: 1,
  isTransitioning: false,
  autoPlayTimer: null,
  hasVisited: [false, false, false, false, false, false, false, false, false, false, false],
  zoneStates: {
    2: { isOpened: false, isRevealed: false, animationPhase: 0 },
    3: { isAnnotated: false },
    4: { scrollProgress: 0 },
    5: { activeCard: null },
    7: { activeHotspot: null },
    9: { viewedFigures: [], activeFigure: null }
  }
};

const NavigationController = {
  /** 滚轮翻页冷却时间 */
  _wheelCooldown: false,
  /** 滚轮累积 delta */
  _wheelAccum: 0,
  /** 触摸起始坐标 */
  _touchStartY: 0,
  _touchStartX: 0,

  init: function() {
    this.bindKeyboard();
    this.bindWheel();
    this.bindTouch();
    this.bindClick();
    this.bindNavButton();
    this.bindQuickNavClose();
    this.bindPopupClose();
    this.updatePageIndicator(1);
  },

  /**
   * Bind keyboard events
   */
  bindKeyboard: function() {
    var self = this;
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        self.nextPage();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        self.prevPage();
      } else if (e.key >= '1' && e.key <= '9') {
        self.jumpTo(parseInt(e.key));
      } else if (e.key === '0') {
        self.jumpTo(10);
      } else if (e.key === '-') {
        self.jumpTo(11);
      } else if (e.key === '=') {
        self.jumpTo(12);
      } else if (e.key === 'Escape') {
        self.closeQuickNav();
        self.closePopup();
      }
    });
  },

  /**
   * 绑定鼠标滚轮事件 — 节流 + 累积阈值
   * 每次翻页后 800ms 冷却，防止触控板惯性连续翻页
   */
  bindWheel: function() {
    var self = this;
    var container = document.getElementById('exhibition-container');

    container.addEventListener('wheel', function(e) {
      // 弹窗内不拦截（弹窗有自己的纵向滚动）
      if (e.target.closest('.evidence-popup')) return;

      e.preventDefault();
      self.resetAutoPlay();

      if (self._wheelCooldown) return;

      self._wheelAccum += e.deltaY;

      if (self._wheelAccum > 40) {
        self._wheelAccum = 0;
        self._wheelCooldown = true;
        self.nextPage();
        setTimeout(function() { self._wheelCooldown = false; }, 800);
      } else if (self._wheelAccum < -40) {
        self._wheelAccum = 0;
        self._wheelCooldown = true;
        self.prevPage();
        setTimeout(function() { self._wheelCooldown = false; }, 800);
      }
    }, { passive: false });
  },

  /**
   * 绑定触摸事件 — 移动端滑动翻页
   */
  bindTouch: function() {
    var self = this;
    var container = document.getElementById('exhibition-container');

    container.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        self._touchStartY = e.touches[0].clientY;
        self._touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      var deltaY = self._touchStartY - e.changedTouches[0].clientY;
      var deltaX = self._touchStartX - e.changedTouches[0].clientX;
      self.resetAutoPlay();

      // 横向滑动 > 纵向 → 不触发翻页（留给横向滚动元素）
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;

      // 弹窗内 → 不触发翻页
      if (e.target.closest('.evidence-popup')) return;

      if (Math.abs(deltaY) < 40) return;
      if (self._wheelCooldown) return;

      self._wheelCooldown = true;

      if (deltaY > 0) {
        self.nextPage();
      } else {
        self.prevPage();
      }

      setTimeout(function() { self._wheelCooldown = false; }, 800);
    });
  },

  /**
   * Bind click events (top half = prev, bottom half = next)
   */
  bindClick: function() {
    var self = this;
    document.getElementById('exhibition-container').addEventListener('click', function(e) {
      // Don't handle if clicking on interactive elements
      if (e.target.closest('#nav-button')) return;
      if (e.target.closest('#quick-nav')) return;
      if (e.target.closest('#popup-overlay')) return;
      if (e.target.closest('.star-figure')) return;
      if (e.target.closest('.envelope-container')) return;
      if (e.target.closest('.hotspot-btn')) return;
      if (e.target.closest('.card-item')) return;
      if (e.target.closest('.timeline-node')) return;
      if (e.target.closest('.click-hint')) return;

      var rect = e.currentTarget.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var midY = rect.height / 2;

      if (y > midY) {
        self.nextPage();
      } else {
        self.prevPage();
      }
    });
  },

  /**
   * Bind nav button
   */
  bindNavButton: function() {
    var self = this;
    document.getElementById('nav-button').addEventListener('click', function(e) {
      e.stopPropagation();
      self.toggleQuickNav();
    });
  },

  /**
   * Bind quick nav close
   */
  bindQuickNavClose: function() {
    var self = this;
    document.getElementById('quick-nav').addEventListener('click', function(e) {
      if (e.target === this) {
        self.closeQuickNav();
      }
    });
  },

  /**
   * Bind popup close
   */
  bindPopupClose: function() {
    var self = this;
    document.getElementById('popup-overlay').addEventListener('click', function(e) {
      if (e.target === this) {
        self.closePopup();
      }
    });
  },

  /**
   * Go to next page
   */
  nextPage: function() {
    if (STATE.currentZone >= getTotalZones()) return;
    scrollToZone(STATE.currentZone + 1);
  },

  /**
   * Go to previous page
   */
  prevPage: function() {
    if (STATE.currentZone <= 1) return;
    scrollToZone(STATE.currentZone - 1);
  },

  /**
   * Jump to zone (quick nav)
   */
  jumpTo: function(zoneId) {
    if (zoneId < 1 || zoneId > getTotalZones()) return;
    this.closeQuickNav();
    this.stopAutoPlay();
    scrollToZone(zoneId);
    this.startAutoPlay();
  },

  /**
   * Update page indicator
   */
  updatePageIndicator: function(zoneId) {
    var el = document.getElementById('page-indicator');
    if (el) {
      var formatted = zoneId < 10 ? '0' + zoneId : zoneId;
      el.textContent = formatted + ' / ' + getTotalZones();
    }

    // Update nav grid active state
    var items = document.querySelectorAll('.quick-nav-item');
    items.forEach(function(item) {
      var id = parseInt(item.getAttribute('data-zone-id'));
      if (id === zoneId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  // ===== Auto Play =====

  startAutoPlay: function() {
    this.stopAutoPlay();

    if (!AUTO_ADVANCE_CONFIG.enabled) return;

    var zoneId = STATE.currentZone;
    var override = AUTO_ADVANCE_CONFIG.perZoneOverrides[zoneId];

    if (override && override.enabled === false) return;

    var delay = (override && override.delay) ? override.delay : AUTO_ADVANCE_CONFIG.defaultDelay;

    var self = this;
    STATE.autoPlayTimer = setTimeout(function() {
      self.nextPage();
    }, delay);
  },

  stopAutoPlay: function() {
    if (STATE.autoPlayTimer) {
      clearTimeout(STATE.autoPlayTimer);
      STATE.autoPlayTimer = null;
    }
  },

  resetAutoPlay: function() {
    this.stopAutoPlay();
    this.startAutoPlay();
  },

  // ===== Quick Nav =====

  toggleQuickNav: function() {
    var panel = document.getElementById('quick-nav');
    if (panel.classList.contains('open')) {
      this.closeQuickNav();
    } else {
      this.openQuickNav();
    }
  },

  openQuickNav: function() {
    this.stopAutoPlay();
    this.renderQuickNav();
    var panel = document.getElementById('quick-nav');
    panel.style.display = 'flex';
    requestAnimationFrame(function() {
      panel.classList.add('open');
    });
  },

  closeQuickNav: function() {
    var panel = document.getElementById('quick-nav');
    panel.classList.remove('open');
    var self = this;
    setTimeout(function() {
      panel.style.display = 'none';
      self.startAutoPlay();
    }, 400);
  },

  renderQuickNav: function() {
    var panel = document.getElementById('quick-nav');
    if (!panel) return;

    // Only render if empty
    if (panel.querySelector('.quick-nav-grid')) return;

    var grid = document.createElement('div');
    grid.className = 'quick-nav-grid';

    var zoneTitles = [
      '封面', '启封仪式', '「難」字', '历史时间轴',
      '何为侨批', '烽火侨批', '经济血脉',
      '人物星河', '当代意义', '致谢', '未完待续'
    ];

    for (var i = 0; i < getTotalZones(); i++) {
      var item = document.createElement('div');
      item.className = 'quick-nav-item';
      if (i + 1 === STATE.currentZone) {
        item.classList.add('active');
      }
      item.setAttribute('data-zone-id', i + 1);

      var numSpan = document.createElement('div');
      numSpan.className = 'qni-number';
      numSpan.textContent = i + 1;

      var titleSpan = document.createElement('div');
      titleSpan.className = 'qni-title';
      titleSpan.textContent = zoneTitles[i] || '展区 ' + (i + 1);

      item.appendChild(numSpan);
      item.appendChild(titleSpan);

      item.addEventListener('click', (function(zoneId) {
        return function() {
          NavigationController.jumpTo(zoneId);
        };
      })(i + 1));

      grid.appendChild(item);
    }

    panel.innerHTML = '';
    panel.appendChild(grid);
  },

  // ===== Popup =====

  showPopup: function(content) {
    this.stopAutoPlay();
    var overlay = document.getElementById('popup-overlay');

    var popup = document.createElement('div');
    popup.className = 'evidence-popup';
    popup.style.cssText = `
      background: rgba(18, 14, 10, 0.97);
      border: 1px solid rgba(220, 190, 140, 0.25);
      color: rgba(220, 200, 170, 0.9);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
    `;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'color: rgba(220, 190, 140, 0.5);';
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      NavigationController.closePopup();
    });
    popup.appendChild(closeBtn);

    if (content.title) {
      var h3 = document.createElement('h3');
      h3.textContent = content.title;
      h3.style.cssText = `
        color: rgba(220, 190, 140, 0.95);
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(15px, 1.2vw, 20px);
        font-weight: 700;
        margin-bottom: 12px;
        letter-spacing: 0.1em;
      `;
      popup.appendChild(h3);
    }

    if (content.body) {
      var p = document.createElement('p');
      p.textContent = content.body;
      p.style.cssText = `
        color: rgba(220, 200, 170, 0.75);
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(12px, 0.8vw, 14px);
        line-height: 2;
      `;
      popup.appendChild(p);
    }

    if (content.source) {
      var source = document.createElement('div');
      source.className = 'popup-source';
      source.textContent = '来源：' + content.source;
      source.style.cssText = `
        font-size: clamp(11px, 0.7vw, 13px);
        color: rgba(220, 190, 140, 0.45);
        margin-top: 12px;
        font-style: italic;
        letter-spacing: 0.05em;
      `;
      popup.appendChild(source);
    }

    overlay.innerHTML = '';
    overlay.appendChild(popup);
    overlay.classList.add('open');
  },

  closePopup: function() {
    var overlay = document.getElementById('popup-overlay');
    overlay.classList.remove('open');
    overlay.innerHTML = '';
    this.startAutoPlay();
  }
};

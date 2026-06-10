/* ================================================
   app.js — 侨批数字展馆 · 应用入口与渲染（JS翻页版）
   ================================================ */

/**
 * 当前可见的展区 ID
 */
var currentVisibleZone = 1;

/**
 * 是否正在翻页动画中
 */
var isAnimating = false;

/**
 * 当前 renderer 的 Y 偏移（视口单位），用于 raf 动画起始值
 */
var rendererOffsetVh = 0;

/**
 * 是否支持 dvh（动态视口高度），iOS Safari 15.4+
 */
var useDvh = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('height', '100dvh');

/**
 * 获取当前使用的视口高度单位
 */
function vhUnit() {
  return useDvh ? 'dvh' : 'vh';
}

/**
 * 手电筒光效 — 鼠标移动时在光标周围显示暖黄光圈
 */
function initCursorLight() {
  var light = document.getElementById('cursor-light');
  if (!light) return;

  var raf = null;

  function move(x, y) {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function() {
      light.style.left = x + 'px';
      light.style.top = y + 'px';
    });
  }

  document.addEventListener('mousemove', function(e) {
    light.classList.add('active');
    move(e.clientX, e.clientY);
  });

  document.addEventListener('mouseleave', function() {
    light.classList.remove('active');
  });
}

/**
 * Application initialization — 一次性渲染所有12个展区
 */
function init() {
  Effects.initPaperOverlay();
  initCursorLight();
  renderAllZones();
  setRendererHeight();
  NavigationController.init();
  NavigationController.updatePageIndicator(1);
  NavigationController.startAutoPlay();
  bindResizeHandler();
}

/**
 * 设置 #zone-renderer 的明确高度，确保 transform 计算正确
 */
function setRendererHeight() {
  var renderer = document.getElementById('zone-renderer');
  var total = getTotalZones();
  var unit = vhUnit();
  renderer.style.height = (total * 100) + unit;
  renderer.style.transform = 'translate3d(0, 0, 0)';
}

/**
 * 监听视口变化（iOS 地址栏显隐、屏幕旋转等）
 */
function bindResizeHandler() {
  var resizeTimeout = null;
  var self = this;

  window.addEventListener('resize', function() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      // 重新计算高度
      setRendererHeight();
      rendererOffsetVh = 0;
      // 重新定位到当前页
      var offset = (STATE.currentZone - 1) * 100;
      var unit = vhUnit();
      var renderer = document.getElementById('zone-renderer');
      renderer.style.transform = 'translate3d(0, -' + offset + unit + ', 0)';
      rendererOffsetVh = offset;
    }, 300); // 防抖 300ms
  });

  // iOS Safari orientationchange 也触发
  window.addEventListener('orientationchange', function() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      setRendererHeight();
      rendererOffsetVh = 0;
      var offset = (STATE.currentZone - 1) * 100;
      var unit = vhUnit();
      var renderer = document.getElementById('zone-renderer');
      renderer.style.transform = 'translate3d(0, -' + offset + unit + ', 0)';
      rendererOffsetVh = offset;
    }, 500);
  });
}

/**
 * 一次性渲染所有展区到 #zone-renderer
 */
function renderAllZones() {
  var container = document.getElementById('zone-renderer');
  var totalZones = getTotalZones();

  for (var zoneId = 1; zoneId <= totalZones; zoneId++) {
    var zone = getZoneData(zoneId);
    if (!zone) continue;

    var pageEl = document.createElement('div');
    pageEl.className = 'zone-page zone-' + zoneId + ' ' + (zone.theme || '');
    pageEl.setAttribute('data-zone-id', zoneId);
    pageEl.id = 'zone-page-' + zoneId;

    // Render by layout type
    switch (zone.layoutType) {
      case 'cover':
        renderCover(zone, pageEl);
        break;
      case 'envelope':
        renderEnvelope(zone, pageEl);
        break;
      case 'character':
        renderCharacter(zone, pageEl);
        break;
      case 'timeline':
        renderTimeline(zone, pageEl);
        break;
      case 'cards':
        renderCards(zone, pageEl);
        break;
      case 'split':
        renderSplitScreen(zone, pageEl);
        break;
      case 'data':
        renderDataVisual(zone, pageEl);
        break;
      case 'stars':
        renderStars(zone, pageEl);
        break;
      case 'splash':
        renderSplash(zone, pageEl);
        break;
      case 'ending':
        renderEnding(zone, pageEl);
        break;
      default:
        pageEl.innerHTML = '<div style="text-align:center;padding:40px;"><h1>' + (zone.title || '展区 ' + zoneId) + '</h1></div>';
    }

    container.appendChild(pageEl);

    // Post-render init for special zones
    postRenderInit(zone, pageEl);
  }
}

/**
 * 翻页到指定展区 (requestAnimationFrame 动画)
 * @param {number} zoneId
 */
/** 翻页锁最大保持时间（防止 raf 丢帧导致永久锁死） */
var MAX_ANIM_LOCK_MS = 1200;

function scrollToZone(zoneId) {
  if (isAnimating) return;
  if (zoneId < 1 || zoneId > getTotalZones()) return;
  if (zoneId === STATE.currentZone) return;

  isAnimating = true;

  // 安全锁：超时强制释放（防止 raf 卡死）
  var safetyTimer = setTimeout(function() {
    if (isAnimating) {
      isAnimating = false;
      // 强制跳回当前 STATE 位置
      var u = vhUnit();
      var off = (STATE.currentZone - 1) * 100;
      var r = document.getElementById('zone-renderer');
      r.style.transform = 'translate3d(0, -' + off + u + ', 0)';
      rendererOffsetVh = off;
    }
  }, MAX_ANIM_LOCK_MS);

  currentVisibleZone = zoneId;
  STATE.currentZone = zoneId;
  STATE.hasVisited[zoneId - 1] = true;
  NavigationController.updatePageIndicator(zoneId);
  NavigationController.resetAutoPlay();

  var unit = vhUnit();
  var renderer = document.getElementById('zone-renderer');
  var startOffset = rendererOffsetVh;
  var targetOffset = (zoneId - 1) * 100;
  var duration = 500;
  var startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(elapsed / duration, 1);

    var eased = 1 - Math.pow(1 - progress, 3);
    var currentOffset = startOffset + (targetOffset - startOffset) * eased;

    renderer.style.transform = 'translate3d(0, -' + currentOffset + unit + ', 0)';

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      clearTimeout(safetyTimer);
      renderer.style.transform = 'translate3d(0, -' + targetOffset + unit + ', 0)';
      rendererOffsetVh = targetOffset;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          isAnimating = false;
        });
      });
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Render a specific zone (保留兼容，用于外部调用时创建并添加到容器)
 * @param {number} zoneId - 1 to 12
 */
function renderZone(zoneId) {
  // 垂直滚动模式下，所有页面已预渲染，此函数保留兼容
  // 如果页面不存在则创建
  var existing = document.getElementById('zone-page-' + zoneId);
  if (existing) return;

  var zone = getZoneData(zoneId);
  if (!zone) return;

  var container = document.getElementById('zone-renderer');
  var pageEl = document.createElement('div');
  pageEl.className = 'zone-page zone-' + zoneId + ' ' + (zone.theme || '');
  pageEl.setAttribute('data-zone-id', zoneId);
  pageEl.id = 'zone-page-' + zoneId;

  switch (zone.layoutType) {
    case 'cover': renderCover(zone, pageEl); break;
    case 'envelope': renderEnvelope(zone, pageEl); break;
    case 'character': renderCharacter(zone, pageEl); break;
    case 'timeline': renderTimeline(zone, pageEl); break;
    case 'cards': renderCards(zone, pageEl); break;
    case 'split': renderSplitScreen(zone, pageEl); break;
    case 'data': renderDataVisual(zone, pageEl); break;
    case 'stars': renderStars(zone, pageEl); break;
    case 'splash': renderSplash(zone, pageEl); break;
    case 'ending': renderEnding(zone, pageEl); break;
    default:
      pageEl.innerHTML = '<div style="text-align:center;padding:40px;"><h1>' + (zone.title || '展区 ' + zoneId) + '</h1></div>';
  }

  container.appendChild(pageEl);
  postRenderInit(zone, pageEl);
}

/**
 * Post-render initialization for zone-specific interactivity
 */
function postRenderInit(zone, pageEl) {
  switch (zone.id) {
    case 1: initCoverPage(pageEl); break;
    case 2: initEnvelopePage(pageEl); break;
    case 3: initCharacterPage(pageEl); break;
    case 4: initTimelinePage(pageEl); break;
    case 5: initCardsPage(pageEl); break;
    case 7: initWarPage(pageEl); break;
    case 8: initEconomyPage(pageEl); break;
    case 9: initStarsPage(pageEl); break;
    case 10: /* 当代意义页无需特殊初始化 */ break;
    case 11: initEndingPage(pageEl); break;
  }
}

// =======================================================================
// Layout Renderers
// =======================================================================

/**
 * Render Cover (Zone 1) / Ending (Zone 12) style
 */
function renderCover(zone, pageEl) {
  var c = zone.content;

  // ========================================
  // 背景层 - 背景图 + 深色渐变遮罩
  // ========================================
  pageEl.style.background = 'transparent';

  // 背景图片层
  var bgImage = document.createElement('div');
  bgImage.className = 'cover-bg-image';
  bgImage.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image: url('images/image1.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 1;
    pointer-events: none;
  `;
  pageEl.appendChild(bgImage);

  // 深色渐变遮罩层 (40% 透明度)
  var darkOverlay = document.createElement('div');
  darkOverlay.className = 'cover-dark-overlay';
  darkOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(8, 6, 3, 0.3) 0%,
      rgba(8, 6, 3, 0.5) 40%,
      rgba(8, 6, 3, 0.7) 70%,
      rgba(8, 6, 3, 0.85) 100%
    );
    pointer-events: none;
  `;
  pageEl.appendChild(darkOverlay);

  // 背景纹理层 (噪点)
  var bgTexture = document.createElement('div');
  bgTexture.className = 'cover-bg-texture';
  bgTexture.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
  `;
  pageEl.appendChild(bgTexture);

  // 浮动侨批元素 - 信纸轮廓 (左上)
  var floatPaper1 = document.createElement('div');
  floatPaper1.className = 'floating-element';
  floatPaper1.style.cssText = `
    position: absolute;
    top: 15%;
    left: 8%;
    width: clamp(80px, 10vw, 140px);
    height: clamp(60px, 8vw, 100px);
    border: 1px solid rgba(201,169,110,0.08);
    border-radius: 2px;
    background: linear-gradient(135deg, rgba(201,169,110,0.03) 0%, transparent 100%);
    z-index: 3;
    animation: floatPaper 8s ease-in-out infinite;
    pointer-events: none;
  `;
  pageEl.appendChild(floatPaper1);

  // 浮动侨批元素 - 印章轮廓 (右上)
  var floatStamp = document.createElement('div');
  floatStamp.className = 'floating-element';
  floatStamp.style.cssText = `
    position: absolute;
    top: 25%;
    right: 12%;
    width: clamp(50px, 6vw, 80px);
    height: clamp(50px, 6vw, 80px);
    border: 2px solid rgba(165,42,42,0.1);
    border-radius: 50%;
    z-index: 3;
    animation: floatStamp 10s ease-in-out infinite;
    pointer-events: none;
  `;
  floatStamp.innerHTML = '<div style="font-family:\'Noto Serif SC\',serif;font-size:clamp(8px,0.6vw,11px);color:rgba(165,42,42,0.15);text-align:center;padding-top:20%;">汕头<br>批局</div>';
  pageEl.appendChild(floatStamp);

  // 浮动侨批元素 - 信纸轮廓 (右下)
  var floatPaper2 = document.createElement('div');
  floatPaper2.className = 'floating-element';
  floatPaper2.style.cssText = `
    position: absolute;
    bottom: 20%;
    right: 8%;
    width: clamp(100px, 12vw, 160px);
    height: clamp(70px, 9vw, 110px);
    border: 1px dashed rgba(201,169,110,0.06);
    border-radius: 2px;
    background: linear-gradient(135deg, transparent 0%, rgba(201,169,110,0.02) 100%);
    z-index: 3;
    animation: floatPaper 12s ease-in-out infinite reverse;
    pointer-events: none;
  `;
  pageEl.appendChild(floatPaper2);

  // ========================================
  // 内容卡片层
  // ========================================
  var contentCard = document.createElement('div');
  contentCard.className = 'cover-content-card';
  contentCard.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 90%;
    max-width: 700px;
  `;

  // 档案标签
  if (c.culturalTags && c.culturalTags.length > 0) {
    var tagsContainer = document.createElement('div');
    tagsContainer.className = 'cultural-tags';
    tagsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      justify-content: center;
    `;
    c.culturalTags.forEach(function(tag, idx) {
      var tagEl = document.createElement('span');
      tagEl.textContent = tag;
      tagEl.style.cssText = `
        font-family: 'Noto Serif SC', serif;
        font-weight: 500;
        font-size: clamp(10px, 0.7vw, 12px);
        color: #FFFFFF;
        letter-spacing: 0.2em;
        padding: 4px 10px;
        border: 1px solid rgba(201,169,110,0.3);
        border-radius: 2px;
        animation: fadeIn 0.8s ease ${idx * 0.1}s both;
        text-shadow:
          -1px 0 rgba(0,0,0,0.7),
          1px 0 rgba(0,0,0,0.7),
          0 0 8px rgba(0,0,0,0.5);
      `;
      tagsContainer.appendChild(tagEl);
    });
    contentCard.appendChild(tagsContainer);
  }

  // 主标题 - 侨批
  var headlineMain = document.createElement('h1');
  headlineMain.className = 'cover-headline';
  headlineMain.textContent = c.headline || '侨批';
  headlineMain.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', 'SimSun', serif;
    font-weight: 900;
    font-size: clamp(56px, 8vw, 120px);
    color: #F2E0C9;
    letter-spacing: 0.3em;
    line-height: 1.1;
    margin: 0;
    text-shadow:
      0 0 4px rgba(0,0,0,0.6),
      0 4px 30px rgba(0,0,0,0.4);
  `;
  contentCard.appendChild(headlineMain);

  // 副标题 - 纸短情长
  if (c.headlineSuffix) {
    var headlineSuffix = document.createElement('div');
    headlineSuffix.className = 'cover-headline-suffix';
    headlineSuffix.textContent = c.headlineSuffix;
    headlineSuffix.style.cssText = `
      font-family: 'Noto Serif SC', 'STKaiti', serif;
      font-weight: 600;
      font-size: clamp(24px, 3vw, 42px);
      color: #F2E0C9;
      letter-spacing: 0.5em;
      margin-top: 8px;
      margin-bottom: 20px;
      text-shadow:
        0 0 4px rgba(0,0,0,0.6),
        0 2px 15px rgba(0,0,0,0.3);
    `;
    contentCard.appendChild(headlineSuffix);
  }

  // 辅助文字 - 研究主题
  var researchText = document.createElement('div');
  researchText.className = 'cover-research-text';
  researchText.textContent = '纸短情长济天下 —— 侨批侨汇与新中国建设研究';
  researchText.style.cssText = `
    font-family: 'Noto Serif SC', 'STSong', 'SimSun', serif;
    font-weight: 600;
    font-size: clamp(12px, 0.9vw, 15px);
    color: #FFFFFF;
    letter-spacing: 0.15em;
    margin-top: 4px;
    margin-bottom: 24px;
    text-shadow:
      -1px 0 rgba(0,0,0,0.7),
      1px 0 rgba(0,0,0,0.7),
      0 0 10px rgba(0,0,0,0.5);
  `;
  contentCard.appendChild(researchText);

  // 说明文字
  if (c.subtitle) {
    var subtitle = document.createElement('p');
    subtitle.className = 'cover-subtitle';
    subtitle.textContent = c.subtitle + '一封家书承载山海乡愁，万千侨汇筑牢家国根基。';
    subtitle.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-weight: 500;
      font-size: clamp(13px, 1vw, 16px);
      color: #FFFFFF;
      letter-spacing: 0.15em;
      margin: 0 0 32px 0;
      line-height: 1.8;
      text-shadow:
        -1px 0 rgba(0,0,0,0.7),
        1px 0 rgba(0,0,0,0.7),
        0 0 10px rgba(0,0,0,0.5);
    `;
    contentCard.appendChild(subtitle);
  }

  // CTA 按钮
  if (c.ctaText) {
    var ctaBtn = document.createElement('button');
    ctaBtn.className = 'cover-cta-btn';
    ctaBtn.textContent = c.ctaText;
    ctaBtn.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(14px, 1vw, 16px);
      color: #1A1209;
      background: linear-gradient(135deg, #D4A574 0%, #C49464 100%);
      border: none;
      border-radius: 4px;
      padding: 14px 36px;
      letter-spacing: 0.2em;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(212,165,116,0.3);
      position: relative;
      overflow: hidden;
    `;
    ctaBtn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 8px 30px rgba(212,165,116,0.5)';
      this.style.background = 'linear-gradient(135deg, #E0B585 0%, #D4A574 100%)';
    });
    ctaBtn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 4px 20px rgba(212,165,116,0.3)';
      this.style.background = 'linear-gradient(135deg, #D4A574 0%, #C49464 100%)';
    });
    ctaBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      NavigationController.nextPage();
    });
    contentCard.appendChild(ctaBtn);
  }

  // 引导语
  if (c.guideText) {
    var guide = document.createElement('p');
    guide.className = 'cover-guide';
    guide.textContent = c.guideText;
    guide.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-weight: 500;
      font-size: clamp(11px, 0.8vw, 13px);
      color: #FFFFFF;
      letter-spacing: 0.1em;
      margin-top: 28px;
      font-style: italic;
      max-width: 500px;
      line-height: 1.8;
      text-shadow:
        -1px 0 rgba(0,0,0,0.7),
        1px 0 rgba(0,0,0,0.7),
        0 0 10px rgba(0,0,0,0.5);
    `;
    contentCard.appendChild(guide);
  }

  pageEl.appendChild(contentCard);

  // ========================================
  // 左上角 - 档案入口标签
  // ========================================
  if (c.topLeftLabel) {
    var topLeft = document.createElement('div');
    topLeft.className = 'cover-top-left';
    topLeft.style.cssText = `
      position: absolute;
      top: 5%;
      left: 5%;
      z-index: 20;
    `;
    topLeft.innerHTML = `
      <div style="
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(10px, 0.7vw, 12px);
        color: #FFFFFF;
        letter-spacing: 0.25em;
        writing-mode: vertical-rl;
        padding: 8px 0;
        border-left: 1px solid rgba(201,169,110,0.3);
        text-shadow:
          -1px 0 rgba(0,0,0,0.7),
          1px 0 rgba(0,0,0,0.7),
          0 0 8px rgba(0,0,0,0.5);
      ">${c.topLeftLabel}</div>
    `;
    topLeft.addEventListener('click', function(e) {
      e.stopPropagation();
      NavigationController.toggleQuickNav();
    });
    topLeft.style.cursor = 'pointer';
    pageEl.appendChild(topLeft);
  }

  // ========================================
  // 右下角 - 章节进度
  // ========================================
  var bottomRight = document.createElement('div');
  bottomRight.className = 'cover-bottom-right';
  bottomRight.style.cssText = `
    position: absolute;
    bottom: 5%;
    right: 5%;
    z-index: 20;
    text-align: right;
  `;
  bottomRight.innerHTML = `
    <div style="
      font-family: 'Noto Serif SC', serif;
      font-weight: 700;
      font-size: clamp(28px, 3vw, 40px);
      color: rgba(201,169,110,0.5);
      letter-spacing: 0.1em;
      line-height: 1;
      margin-bottom: 4px;
      text-shadow:
        -1px 0 rgba(0,0,0,0.7),
        1px 0 rgba(0,0,0,0.7),
        0 0 10px rgba(0,0,0,0.5);
    ">01</div>
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 500;
      font-size: clamp(10px, 0.7vw, 12px);
      color: #FFFFFF;
      letter-spacing: 0.15em;
      text-shadow:
        -1px 0 rgba(0,0,0,0.7),
        1px 0 rgba(0,0,0,0.7),
        0 0 8px rgba(0,0,0,0.5);
    ">档案入口</div>
  `;
  pageEl.appendChild(bottomRight);

  // ========================================
  // 底部装饰线
  // ========================================
  var bottomLine = document.createElement('div');
  bottomLine.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,169,110,0.1) 20%, rgba(201,169,110,0.1) 80%, transparent);
    z-index: 3;
  `;
  pageEl.appendChild(bottomLine);

  // ========================================
  // 滚动提示
  // ========================================
  if (c.showEnterHint) {
    var scrollHint = document.createElement('div');
    scrollHint.className = 'scroll-hint';
    scrollHint.style.cssText = `
      position: absolute;
      bottom: 8%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      opacity: 0.4;
      transition: opacity 0.3s ease;
      cursor: pointer;
    `;
    scrollHint.innerHTML = `
      <div style="
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(9px, 0.6vw, 11px);
        color: rgba(201,169,110,0.6);
        letter-spacing: 0.2em;
      ">${c.enterHintText || '向下滚动探索'}</div>
      <div style="
        width: 1px;
        height: 30px;
        background: linear-gradient(to bottom, rgba(201,169,110,0.6), transparent);
        animation: scrollPulse 2s ease-in-out infinite;
      "></div>
    `;
    scrollHint.addEventListener('click', function() {
      NavigationController.nextPage();
    });
    pageEl.appendChild(scrollHint);
  }
}

/**
 * Render Envelope (Zone 2)
 */
function renderEnvelope(zone, pageEl) {
  var c = zone.content;

  // ========================================
  // 背景层 - 深色遮罩 (与第3页一致)
  // ========================================
  pageEl.style.background = 'transparent';

  // 深色渐变遮罩层 (与第1页、第3页一致)
  var darkOverlay = document.createElement('div');
  darkOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(8, 6, 3, 0.5) 0%,
      rgba(8, 6, 3, 0.7) 40%,
      rgba(8, 6, 3, 0.85) 100%
    );
    pointer-events: none;
  `;
  pageEl.appendChild(darkOverlay);

  // 噪声纹理层
  var brushTexture = document.createElement('div');
  brushTexture.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
  `;
  pageEl.appendChild(brushTexture);

  // ========================================
  // 内容层
  // ========================================
  var wrapper = document.createElement('div');
  wrapper.className = 'envelope-wrapper';
  wrapper.style.cssText = `
    position: absolute;
    left: 50%;
    top: 40%;
    transform: translate(-50%, -50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90%;
    max-width: 600px;
    animation: pageReveal 1.2s ease 0.3s both;
  `;

  // 主标题 - 深色主题白色文字
  var pageTitle = document.createElement('h2');
  pageTitle.className = 'envelope-title';
  pageTitle.id = 'envelope-title';
  pageTitle.textContent = c.title || '开启家书';
  pageTitle.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-weight: 800;
    font-size: clamp(28px, 3.5vw, 48px);
    color: rgba(220, 190, 140, 0.95);
    letter-spacing: 0.4em;
    margin: 0 0 24px 0;
    opacity: 0;
    position: relative;
    text-shadow: 0 0 20px rgba(220, 190, 140, 0.3), 0 2px 10px rgba(0,0,0,0.5);
  `;
  wrapper.appendChild(pageTitle);

  // ========================================
  // 信封卡片 - 深色半透明背景
  // ========================================
  var envelopeCard = document.createElement('div');
  envelopeCard.className = 'envelope-card';
  envelopeCard.style.cssText = `
    width: 100%;
    max-width: 480px;
    aspect-ratio: 3 / 2;
    background: rgba(20, 20, 30, 0.6);
    border: 1px solid rgba(220, 190, 140, 0.1);
    border-radius: 6px;
    position: relative;
    cursor: pointer;
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: envelopeBreath 4s ease-in-out infinite;
    overflow: hidden;
  `;

  // 信封图片背景
  if (c.envelopeImage) {
    var envBg = document.createElement('div');
    envBg.style.cssText = `
      position: absolute;
      inset: 0;
      background: url('${c.envelopeImage}') center center / cover no-repeat;
      opacity: 0.7;
      transition: opacity 0.3s ease;
    `;
    envelopeCard.appendChild(envBg);

    // 深色叠加层
    var darkOverlayCard = document.createElement('div');
    darkOverlayCard.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%);
      opacity: 0.8;
    `;
    envelopeCard.appendChild(darkOverlayCard);
  }

  // 档案标签 - 深色主题
  var archiveTag = document.createElement('div');
  archiveTag.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(220, 190, 140, 0.15);
    color: rgba(220, 190, 140, 0.9);
    font-family: 'Noto Serif SC', serif;
    font-size: clamp(9px, 0.6vw, 11px);
    padding: 5px 10px;
    border-radius: 3px;
    letter-spacing: 0.1em;
    border: 1px solid rgba(220, 190, 140, 0.2);
    backdrop-filter: blur(4px);
  `;
  archiveTag.textContent = '■ 档案原件';
  envelopeCard.appendChild(archiveTag);

  // Hover 效果
  envelopeCard.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-8px) scale(1.02)';
    this.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 30px rgba(220, 190, 140, 0.1)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.25)';
  });

  envelopeCard.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.1)';
  });

  // ========================================
  // 信纸内容（隐藏，展开时显示）- 深色主题
  // ========================================
  var letterPaper = document.createElement('div');
  letterPaper.className = 'letter-paper-reveal';
  letterPaper.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(20, 18, 15, 0.95);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.95);
    transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
    padding: 30px;
    backdrop-filter: blur(10px);
  `;

  // 信纸内容 - 抬头
  var letterHeader = document.createElement('div');
  letterHeader.style.cssText = `
    font-family: 'Noto Serif SC', serif;
    font-size: clamp(10px, 0.7vw, 12px);
    color: rgba(220, 190, 140, 0.8);
    letter-spacing: 0.2em;
    margin-bottom: 16px;
    opacity: 0;
    transition: opacity 0.5s ease 0.3s;
  `;
  letterHeader.textContent = '■ 档案原件';
  letterPaper.appendChild(letterHeader);

  // 信纸内容 - 主要文字
  var letterContent = document.createElement('div');
  letterContent.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-weight: 700;
    font-size: clamp(24px, 3vw, 40px);
    color: rgba(220, 190, 140, 0.95);
    letter-spacing: 0.25em;
    text-align: center;
    opacity: 0;
    transition: opacity 0.5s ease 0.5s;
    text-shadow: 0 0 20px rgba(220, 190, 140, 0.3);
  `;
  letterContent.textContent = c.revealText || '见字如面';
  letterPaper.appendChild(letterContent);

  // 信纸内容 - 副标题
  var letterSubtitle = document.createElement('div');
  letterSubtitle.style.cssText = `
    font-family: 'Noto Serif SC', serif;
    font-size: clamp(11px, 0.8vw, 14px);
    color: rgba(200, 200, 210, 0.8);
    opacity: 0;
    letter-spacing: 0.15em;
    margin-top: 16px;
    transition: opacity 0.5s ease 0.7s;
  `;
  letterSubtitle.textContent = '一封来自海外的牵挂';
  letterPaper.appendChild(letterSubtitle);

  // 继续探索按钮
  var continueBtn = document.createElement('button');
  continueBtn.style.cssText = `
    margin-top: 32px;
    font-family: 'Noto Serif SC', serif;
    font-size: clamp(12px, 0.8vw, 14px);
    color: rgba(220, 190, 140, 0.9);
    background: transparent;
    border: 1px solid rgba(220, 190, 140, 0.3);
    border-radius: 4px;
    padding: 10px 24px;
    letter-spacing: 0.15em;
    cursor: pointer;
    opacity: 0;
    transition: all 0.3s ease, opacity 0.5s ease 1s;
  `;
  continueBtn.textContent = '继续探索 →';
  continueBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    NavigationController.nextPage();
  });
  continueBtn.addEventListener('mouseenter', function() {
    this.style.background = 'rgba(220, 190, 140, 0.1)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.5)';
  });
  continueBtn.addEventListener('mouseleave', function() {
    this.style.background = 'transparent';
    this.style.borderColor = 'rgba(220, 190, 140, 0.3)';
  });
  letterPaper.appendChild(continueBtn);

  envelopeCard.appendChild(letterPaper);

  // 展开状态标记
  var isOpened = false;

  // 点击展开动画
  envelopeCard.addEventListener('click', function() {
    if (isOpened) return;
    isOpened = true;
    envelopeCard.style.transform = 'scale(0.9)';
    envelopeCard.style.opacity = '0';
    envelopeCard.style.transition = 'all 0.6s cubic-bezier(0.55, 0.055, 0.675, 0.19)';

    setTimeout(function() {
      letterPaper.style.opacity = '1';
      letterPaper.style.transform = 'scale(1)';
      letterPaper.style.pointerEvents = 'auto';
      letterHeader.style.opacity = '1';
      letterContent.style.opacity = '1';
      letterSubtitle.style.opacity = '1';
      continueBtn.style.opacity = '1';
    }, 400);
  });

  wrapper.appendChild(envelopeCard);

  // ========================================
  // 档案信息区 - 深色主题标签
  // ========================================
  var archiveMeta = document.createElement('div');
  archiveMeta.className = 'archive-meta';
  archiveMeta.style.cssText = `
    display: flex;
    gap: 20px;
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;
    opacity: 0;
    animation: fadeIn 0.8s ease 1.5s both;
  `;

  // 来源标签
  if (c.archiveInfo) {
    var sourceTag = document.createElement('span');
    sourceTag.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-weight: 600;
      font-size: clamp(10px, 0.7vw, 12px);
      color: rgba(220, 190, 140, 0.9);
      letter-spacing: 0.15em;
      padding: 4px 12px;
      background: rgba(20, 20, 30, 0.6);
      border-radius: 2px;
      border: 1px solid rgba(220, 190, 140, 0.15);
      backdrop-filter: blur(4px);
    `;
    sourceTag.textContent = '来源: ' + c.archiveInfo;
    archiveMeta.appendChild(sourceTag);
  }

  // 时间标签
  if (c.archiveYear) {
    var yearTag = document.createElement('span');
    yearTag.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-weight: 600;
      font-size: clamp(10px, 0.7vw, 12px);
      color: rgba(220, 190, 140, 0.9);
      letter-spacing: 0.15em;
      padding: 4px 12px;
      background: rgba(20, 20, 30, 0.6);
      border-radius: 2px;
      border: 1px solid rgba(220, 190, 140, 0.15);
      backdrop-filter: blur(4px);
    `;
    yearTag.textContent = '时间: ' + c.archiveYear;
    archiveMeta.appendChild(yearTag);
  }

  // 状态标签
  var statusTag = document.createElement('span');
  statusTag.style.cssText = `
    font-family: 'Noto Serif SC', serif;
    font-weight: 600;
    font-size: clamp(10px, 0.7vw, 12px);
    color: rgba(220, 190, 140, 0.9);
    letter-spacing: 0.15em;
    padding: 4px 12px;
    background: rgba(20, 20, 30, 0.6);
    border-radius: 2px;
    border: 1px solid rgba(220, 190, 140, 0.15);
    backdrop-filter: blur(4px);
  `;
  statusTag.textContent = '状态: 已封存';
  archiveMeta.appendChild(statusTag);

  wrapper.appendChild(archiveMeta);

  // ========================================
  // 描述文本 - 深色主题
  // ========================================
  if (c.description) {
    var desc = document.createElement('p');
    desc.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(12px, 0.85vw, 14px);
      color: rgba(200, 200, 210, 0.7);
      opacity: 0;
      letter-spacing: 0.12em;
      line-height: 1.9;
      margin: 8px 0 0 0;
      text-align: center;
      animation: fadeIn 0.8s ease 1.8s both;
    `;
    desc.textContent = '一封1932年从菲律宾马尼拉寄往潮汕的侨批，正等待你开启这段跨越山海的思念';
    wrapper.appendChild(desc);
  }

  // ========================================
  // CTA 按钮 - 深色主题
  // ========================================
  var ctaBtn = document.createElement('button');
  ctaBtn.className = 'envelope-cta';
  ctaBtn.id = 'envelope-cta';
  ctaBtn.style.cssText = `
    margin-top: 28px;
    font-family: 'Noto Serif SC', serif;
    font-weight: 600;
    font-size: clamp(13px, 0.9vw, 15px);
    color: rgba(220, 190, 140, 0.95);
    background:
      linear-gradient(135deg, rgba(220, 190, 140, 0.1) 0%, transparent 50%),
      rgba(20, 20, 30, 0.7);
    border: 1px solid rgba(220, 190, 140, 0.25);
    border-radius: 4px;
    padding: 14px 36px;
    letter-spacing: 0.2em;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    opacity: 0;
    animation: fadeIn 0.8s ease 2.2s both, ctaBreath 3s ease-in-out 2.5s infinite;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(4px);
  `;
  ctaBtn.textContent = '▶ 拆开这封家书';
  ctaBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4), rgba(220, 190, 140, 0.15)';
    this.style.background = 'rgba(220, 190, 140, 0.15)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.4)';
  });
  ctaBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
    this.style.background = 'linear-gradient(135deg, rgba(220, 190, 140, 0.1) 0%, transparent 50%), rgba(20, 20, 30, 0.7)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.25)';
  });
  wrapper.appendChild(ctaBtn);

  pageEl.appendChild(wrapper);

  // ========================================
  // 底部探索提示 - 深色主题
  // ========================================
  var bottomHint = document.createElement('div');
  bottomHint.style.cssText = `
    position: absolute;
    bottom: 3%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    opacity: 0.25;
    animation: fadeIn 1s ease 2.5s both;
  `;
  bottomHint.innerHTML = `
    <div style="
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(9px, 0.6vw, 11px);
      color: rgba(220, 190, 140, 0.8);
      letter-spacing: 0.2em;
    ">继续探索</div>
    <div style="
      width: 1px;
      height: 24px;
      background: linear-gradient(to bottom, rgba(220, 190, 140, 0.5), transparent);
    "></div>
  `;
  pageEl.appendChild(bottomHint);

  // ========================================
  // 打字机效果初始化
  // ========================================
  setTimeout(function() {
    typewriterEffect(pageTitle, c.title || '开启家书', 80);
  }, 600);

  // ========================================
  // 侨批档案模态面板 - 深色主题
  // ========================================
  var modalOverlay = document.createElement('div');
  modalOverlay.className = 'qiaopi-modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.4s ease;
  `;

  // 模态面板容器
  var modalPanel = document.createElement('div');
  modalPanel.className = 'qiaopi-modal-panel';
  modalPanel.style.cssText = `
    width: 70%;
    max-width: 1000px;
    max-height: 85vh;
    background: rgba(18, 16, 14, 0.95);
    border-radius: 8px;
    border: 1px solid rgba(220, 190, 140, 0.15);
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(220, 190, 140, 0.05);
    display: flex;
    overflow: hidden;
    transform: scale(0.9);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(10px);
  `;

  // 左侧图片区域
  var modalLeft = document.createElement('div');
  modalLeft.style.cssText = `
    flex: 1;
    min-width: 45%;
    background: rgba(20, 18, 15, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
    position: relative;
    overflow: hidden;
    border-right: 1px solid rgba(220, 190, 140, 0.1);
  `;

  // 侨批图片
  var qiaopiImg = document.createElement('img');
  qiaopiImg.src = 'images/image2.png';
  qiaopiImg.style.cssText = `
    max-width: 100%;
    max-height: 60vh;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    cursor: zoom-in;
    transition: all 0.3s ease;
    filter: brightness(0.9) contrast(1.05);
  `;
  qiaopiImg.addEventListener('click', function() {
    this.style.transform = 'scale(1.05)';
    this.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.5)';
  });
  modalLeft.appendChild(qiaopiImg);

  // 右侧文字区域
  var modalRight = document.createElement('div');
  modalRight.style.cssText = `
    flex: 1;
    padding: 36px 32px;
    overflow-y: auto;
    position: relative;
  `;

  // 关闭按钮
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    background: rgba(220, 190, 140, 0.1);
    border: 1px solid rgba(220, 190, 140, 0.2);
    border-radius: 50%;
    font-size: 20px;
    color: rgba(220, 190, 140, 0.9);
    cursor: pointer;
    transition: all 0.3s ease;
    line-height: 1;
  `;
  closeBtn.addEventListener('mouseenter', function() {
    this.style.background = 'rgba(220, 190, 140, 0.2)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.35)';
  });
  closeBtn.addEventListener('mouseleave', function() {
    this.style.background = 'rgba(220, 190, 140, 0.1)';
    this.style.borderColor = 'rgba(220, 190, 140, 0.2)';
  });

  // 面板标题
  var modalTitle = document.createElement('h3');
  modalTitle.textContent = '侨批档案原件';
  modalTitle.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-weight: 700;
    font-size: clamp(18px, 2vw, 24px);
    color: rgba(220, 190, 140, 0.95);
    letter-spacing: 0.15em;
    margin: 0 0 24px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(220, 190, 140, 0.15);
  `;

  // 档案信息标签
  var archiveInfoDiv = document.createElement('div');
  archiveInfoDiv.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  `;

  var archiveTags = [
    { label: '来源', value: '侨批档案 · 广东潮汕' },
    { label: '时间', value: '1932年 · 菲律宾马尼拉寄出' },
    { label: '寄信人', value: '华侨林锡国' },
    { label: '收信地', value: '广东潮汕澄海' }
  ];

  archiveTags.forEach(function(item) {
    var tag = document.createElement('div');
    tag.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(11px, 0.8vw, 13px);
      color: rgba(200, 200, 210, 0.9);
      letter-spacing: 0.1em;
      padding: 6px 12px;
      background: rgba(220, 190, 140, 0.05);
      border-radius: 2px;
      border: 1px solid rgba(220, 190, 140, 0.1);
      display: flex;
      gap: 8px;
    `;
    tag.innerHTML = '<span style="color: rgba(220, 190, 140, 0.6); min-width: 50px;">' + item.label + ':</span><span>' + item.value + '</span>';
    archiveInfoDiv.appendChild(tag);
  });

  // 家书原文标题
  var letterTitle = document.createElement('h4');
  letterTitle.textContent = '家书原文节选';
  letterTitle.style.cssText = `
    font-family: 'Noto Serif SC', serif;
    font-weight: 600;
    font-size: clamp(13px, 0.9vw, 15px);
    color: rgba(220, 190, 140, 0.9);
    letter-spacing: 0.1em;
    margin: 0 0 10px 0;
  `;

  // 家书原文内容
  var letterQuote = document.createElement('div');
  letterQuote.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-size: clamp(12px, 0.85vw, 14px);
    color: rgba(200, 200, 210, 0.85);
    line-height: 1.8;
    letter-spacing: 0.08em;
    padding: 12px;
    background: rgba(220, 190, 140, 0.05);
    border-left: 3px solid rgba(220, 190, 140, 0.25);
    margin-bottom: 20px;
    font-style: italic;
  `;
  letterQuote.innerHTML = '「凡是中国的国民，都要尽国民一份子的责任，同心奋斗，挽救危亡。」';

  // 档案背景标题
  var storyTitle = document.createElement('h4');
  storyTitle.textContent = '档案背景';
  storyTitle.style.cssText = `
    font-family: 'Noto Serif SC', serif;
    font-weight: 600;
    font-size: clamp(13px, 0.9vw, 15px);
    color: rgba(220, 190, 140, 0.9);
    letter-spacing: 0.1em;
    margin: 0 0 10px 0;
  `;

  var storyContent = document.createElement('div');
  storyContent.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-size: clamp(12px, 0.85vw, 14px);
    color: rgba(200, 200, 210, 0.8);
    line-height: 1.9;
    letter-spacing: 0.08em;
  `;
  storyContent.innerHTML = '<p style="margin: 0;">这封侨批不仅是一封普通的家书，更是海外华侨心系家国、支援祖国建设的见证。当年，无数像林锡国一样的华侨，正是通过侨批侨汇，将海外的积蓄寄回祖国，为新中国初期的经济建设注入了关键力量。</p>';

  modalRight.appendChild(closeBtn);
  modalRight.appendChild(modalTitle);
  modalRight.appendChild(archiveInfoDiv);
  modalRight.appendChild(letterTitle);
  modalRight.appendChild(letterQuote);
  modalRight.appendChild(storyTitle);
  modalRight.appendChild(storyContent);

  // 组装面板
  modalPanel.appendChild(modalLeft);
  modalPanel.appendChild(modalRight);
  modalOverlay.appendChild(modalPanel);

  // 关闭功能
  closeBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) closeModal();
  });

  function closeModal() {
    modalOverlay.style.opacity = '0';
    modalOverlay.style.visibility = 'hidden';
    modalPanel.style.transform = 'scale(0.9)';
  }

  function openModal() {
    modalOverlay.style.opacity = '1';
    modalOverlay.style.visibility = 'visible';
    modalPanel.style.transform = 'scale(1)';
  }

  // 添加到页面
  document.body.appendChild(modalOverlay);

  // 修改按钮点击事件
  ctaBtn.onclick = function(e) {
    e.stopPropagation();
    openModal();
  };
}

/**
 * 打字机效果
 */
function typewriterEffect(element, text, speed) {
  var index = 0;
  element.style.opacity = '1';

  function type() {
    if (index < text.length) {
      element.textContent = text.substring(0, index + 1);
      index++;
      setTimeout(type, speed);
    }
  }

  type();
}

/**
 * Render Character (Zone 3 — 「難」)
 */
function renderCharacter(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ============================================================
  // 视差层 — 背景层 (.parallax-layer-bg)
  // 包含深色遮罩 + 噪声纹理 + 左侧四字词
  // ============================================================
  var bgLayer = document.createElement('div');
  bgLayer.className = 'parallax-layer-bg';
  bgLayer.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';

  // 深色遮罩
  var darkOverlay = document.createElement('div');
  darkOverlay.style.cssText = `
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.45);
  `;
  bgLayer.appendChild(darkOverlay);

  // 噪声纸张纹理
  var brushTexture = document.createElement('div');
  brushTexture.style.cssText = `
    position: absolute; inset: 0;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  `;
  bgLayer.appendChild(brushTexture);

  // 左侧四字背景词
  var emotionLayer = document.createElement('div');
  emotionLayer.className = 'diff-emotion-words';
  emotionLayer.style.cssText = `
    position: absolute;
    left: 2.5%;
    top: 8%;
    bottom: 8%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;
  var words = ['漂洋过海', '骨肉分离', '谋生艰辛', '语言隔阂', '思乡难归'];
  words.forEach(function(word) {
    var wordEl = document.createElement('div');
    wordEl.style.cssText = `
      font-family: 'Noto Serif SC', 'STKaiti', serif;
      font-size: 46px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.13);
      letter-spacing: 0.18em;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      line-height: 1.2;
      user-select: none;
      text-shadow: 0 0 20px rgba(255,255,255,0.05);
    `;
    wordEl.textContent = word;
    emotionLayer.appendChild(wordEl);
  });
  bgLayer.appendChild(emotionLayer);
  pageEl.appendChild(bgLayer);

  // ============================================================
  // 视差层 — 中间层 (.parallax-layer-mid)
  // 包含三大苦难板块
  // ============================================================
  var midLayer = document.createElement('div');
  midLayer.style.cssText = `
    position: absolute;
    right: 4%;
    top: 50%;
    transform: translateY(-50%);
    width: 36%;
    max-width: 460px;
    z-index: 3;
  `;

  var sectionsWrap = document.createElement('div');
  sectionsWrap.className = 'diff-sections';
  sectionsWrap.style.cssText = 'position:relative;';

  // 三大苦难板块
  if (c.sections && c.sections.length > 0) {
    c.sections.forEach(function(sec) {
      var secEl = document.createElement('div');
      secEl.className = 'diff-section';
      secEl.style.cssText = `
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 4px;
        padding: 14px 18px 16px;
        margin-bottom: 14px;
      `;

      var secTitle = document.createElement('div');
      secTitle.style.cssText = `
        font-family: 'Noto Serif SC', serif;
        font-size: 15px;
        font-weight: 700;
        color: rgba(220, 180, 100, 0.9);
        letter-spacing: 0.1em;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      secTitle.innerHTML = '<span style="font-size:18px;line-height:1;">' + (sec.icon || '⬛') + '</span> ' + sec.title;
      secEl.appendChild(secTitle);

      var secText = document.createElement('div');
      secText.className = 'section-text';
      secText.style.cssText = `
        font-family: 'Noto Serif SC', serif;
        font-size: 13px;
        color: #ccc;
        line-height: 1.85;
        letter-spacing: 0.03em;
      `;
      secText.textContent = sec.text;
      secEl.appendChild(secText);

      sectionsWrap.appendChild(secEl);
    });
  }

  midLayer.appendChild(sectionsWrap);
  pageEl.appendChild(midLayer);

  // ============================================================
  // 视差层 — 前景层 (.parallax-layer-fg)
  // 包含中央「難」字 + 档案标注 + 情感引用
  // ============================================================
  var fgLayer = document.createElement('div');
  fgLayer.className = 'parallax-layer-fg';
  fgLayer.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;';

  // 页面主标题（在图片正上方）
  if (c.pageMainTitle) {
    var mainTitle = document.createElement('h2');
    mainTitle.className = 'page-main-title';
    mainTitle.textContent = c.pageMainTitle;
    mainTitle.style.cssText = `
      text-align: center;
      width: 100%;
      padding-top: 40px;
      margin-bottom: 30px;
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(18px, 2.8vw, 36px);
      font-weight: 900;
      color: rgba(220, 190, 140, 0.9);
      letter-spacing: 0.2em;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      opacity: 0;
      animation: fadeIn 1.2s ease 0.3s forwards;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 6;
    `;
    fgLayer.appendChild(mainTitle);
  }

  // 中央「難」字图片
  var charEl = document.createElement('div');
  charEl.className = 'nan-character-display';
  // 不设置 textContent，保持背景图片显示
  charEl.style.cssText = `
    position: absolute;
    left: 50%;
    top: 42%;
    transform: translate(-50%, -50%);
    width: clamp(200px, 28vw, 480px);
    height: clamp(200px, 28vw, 480px);
    background-image: url('images/image3.png');
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    filter: drop-shadow(0 8px 32px rgba(0,0,0,0.7));
    user-select: none;
    animation: characterBreath 4s ease-in-out infinite;
    z-index: 3;
  `;
  fgLayer.appendChild(charEl);

  // 档案标注
  var imageCaption = document.createElement('div');
  imageCaption.style.cssText = `
    position: absolute;
    left: 50%;
    top: calc(42% + clamp(100px, 15vw, 250px) + 16px);
    transform: translateX(-50%);
    font-family: 'Noto Serif SC', serif;
    font-weight: 300;
    font-size: 13px;
    color: #FFFFFF;
    letter-spacing: 0.1em;
    white-space: nowrap;
    text-shadow: 0 0 8px rgba(255,255,255,0.8);
    z-index: 5;
  `;
  imageCaption.textContent = c.source || '陈君瑞侨批，1927年';
  fgLayer.appendChild(imageCaption);

  // 情感引用 blockquote
  if (c.quote) {
    var quoteWrap = document.createElement('div');
    quoteWrap.className = 'diff-quote-wrapper';
    quoteWrap.style.cssText = `
      position: absolute;
      bottom: 6%;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      text-align: center;
      pointer-events: none;
    `;
    var bq = document.createElement('blockquote');
    bq.className = 'diff-quote';
    bq.style.cssText = `
      color: #8b0000;
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(16px, 1.5vw, 24px);
      font-weight: 700;
      letter-spacing: 0.12em;
      border-left: 5px solid #8b0000;
      padding: 14px 22px;
      margin: 0;
      background: rgba(139,0,0,0.04);
      line-height: 1.65;
      text-align: center;
    `;
    bq.innerHTML = c.quote + (c.quoteSource ? '<cite>' + c.quoteSource + '</cite>' : '');
    quoteWrap.appendChild(bq);
    fgLayer.appendChild(quoteWrap);
  }

  pageEl.appendChild(fgLayer);

  // 页面顶部装饰线
  var topLine = document.createElement('div');
  topLine.style.cssText = `
    position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(165,42,42,0.15) 20%, rgba(165,42,42,0.15) 80%, transparent);
    z-index: 5;
  `;
  pageEl.appendChild(topLine);

  // ============================================================
  // 激活特效（页面激活后）
  // ============================================================
  setTimeout(function() {
    Effects.initZone3Parallax(pageEl);
    Effects.initZone3Shake(charEl, 5000);
  }, 300);
}

/**
 * Render Timeline (Zone 4)
 */
function renderTimeline(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'linear-gradient(180deg, #1a1510 0%, #0f0d0a 100%)';
  pageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

  // 页面顶部装饰线
  var topLine = document.createElement('div');
  topLine.style.cssText = 'position:absolute;top:0;left:12%;right:12%;height:1px;' +
    'background:linear-gradient(90deg,transparent,rgba(245,230,200,0.15)20%,rgba(245,230,200,0.15)80%,transparent);' +
    'z-index:4;pointer-events:none;';
  pageEl.appendChild(topLine);

  // 标题
  var title = document.createElement('h2');
  title.className = 'timeline-title';
  title.textContent = '历史时间轴';
  title.style.cssText = 'position:absolute;top:5%;left:50%;transform:translateX(-50%);' +
    'font-family:"Noto Serif SC","STKaiti",serif;font-weight:900;' +
    'font-size:clamp(22px,2vw,36px);color:rgba(245,230,200,0.95);' +
    'text-shadow:0 0 10px rgba(245,230,200,0.5);letter-spacing:0.25em;z-index:5;';
  pageEl.appendChild(title);

  // 副标题
  if (c.subtitle) {
    var subtitle = document.createElement('p');
    subtitle.className = 'timeline-subtitle';
    subtitle.textContent = c.subtitle;
    subtitle.style.cssText = 'position:absolute;top:12%;left:50%;transform:translateX(-50%);' +
      'font-family:"Noto Serif SC",serif;font-size:clamp(11px,0.8vw,14px);' +
      'color:rgba(245,230,200,0.75);text-shadow:0 0 6px rgba(245,230,200,0.4);' +
      'letter-spacing:0.3em;z-index:5;';
    pageEl.appendChild(subtitle);
  }

  // 时间轴主体区域
  var timelineSection = document.createElement('div');
  timelineSection.style.cssText = 'position:absolute;left:8%;right:8%;top:24%;bottom:12%;z-index:5;';
  pageEl.appendChild(timelineSection);

  // 节点轨道 — 6个槽位水平等分
  var track = document.createElement('div');
  track.className = 'tl-track';
  track.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;display:flex;z-index:2;';
  timelineSection.appendChild(track);

  if (c.nodes && c.nodes.length > 0) {
    c.nodes.forEach(function(node, idx) {
      // 每个槽位：圆在上、年份在圆下、轴线在年份下，三点垂直居中对齐
      var slot = document.createElement('div');
      slot.className = 'tl-slot';
      slot.style.cssText = 'flex:1;position:relative;cursor:pointer;';

      // 圆 — 固定在槽位垂直居中点上方
      if (node.icon) {
        var circle = document.createElement('div');
        circle.className = 'tl-circle';
        circle.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
          'margin-top:-72px;' +
          'width:clamp(50px,5vw,72px);height:clamp(50px,5vw,72px);' +
          'border-radius:50%;' +
          'background:rgba(245,230,200,0.08);' +
          'border:2px solid rgba(180,80,60,0.7);' +
          'display:flex;align-items:center;justify-content:center;' +
          'font-family:"Noto Serif SC","STKaiti",serif;font-weight:900;' +
          'font-size:clamp(16px,1.8vw,26px);' +
          'color:rgba(245,230,200,0.95);' +
          'text-shadow:0 0 10px rgba(245,230,200,0.6);' +
          'box-shadow:0 0 12px rgba(180,80,60,0.2),inset 0 0 8px rgba(245,230,200,0.05);' +
          'transition:all 0.3s ease;z-index:2;';
        circle.textContent = node.icon;
        slot.appendChild(circle);
      }

      // 年份 — 固定在圆正下方（槽位垂直居中点上方圆的下边缘）
      var yearEl = document.createElement('div');
      yearEl.className = 'tl-year';
      yearEl.style.cssText = 'position:absolute;left:50%;top:50%;transform:translateX(-50%);' +
        'margin-top:-36px;' +
        'font-family:"Noto Serif SC",serif;font-weight:900;' +
        'font-size:clamp(18px,2vw,30px);' +
        'color:rgba(245,230,200,0.95);' +
        'text-shadow:0 0 10px rgba(245,230,200,0.5);' +
        'letter-spacing:0.08em;white-space:nowrap;' +
        'transition:transform 0.3s ease;';
      yearEl.textContent = node.year;
      slot.appendChild(yearEl);

      // 时间轴节点小段 — 固定在年份正下方，延伸至槽位两端
      var nodeLine = document.createElement('div');
      nodeLine.style.cssText = 'position:absolute;left:0;right:0;top:50%;height:2px;' +
        'background:transparent;pointer-events:none;';
      slot.appendChild(nodeLine);

      // 说明文字 — 固定在轴线正下方，默认隐藏
      if (node.desc || node.detailText) {
        var desc = document.createElement('div');
        desc.className = 'tl-desc';
        desc.style.cssText = 'position:absolute;left:50%;top:50%;transform:translateX(-50%);' +
          'margin-top:24px;' +
          'font-family:"Noto Serif SC",serif;' +
          'font-size:clamp(9px,0.7vw,11px);' +
          'color:rgba(245,230,200,0.85);' +
          'text-shadow:0 0 4px rgba(245,230,200,0.3);' +
          'line-height:1.7;text-align:center;' +
          'max-width:160px;opacity:0;' +
          'transition:opacity 0.3s ease,transform 0.3s ease;pointer-events:none;' +
          'white-space:normal;word-break:break-all;';
        desc.textContent = node.desc || node.detailText;
        slot.appendChild(desc);

        // hover 显示说明 + 圆/年份上移
        slot.addEventListener('mouseenter', function() {
          if (circle) circle.style.transform = 'translate(-50%,-50%) translateY(-6px) scale(1.1)';
          if (circle) {
            circle.style.borderColor = 'rgba(220,100,80,0.95)';
            circle.style.boxShadow = '0 0 24px rgba(220,100,80,0.45),inset 0 0 12px rgba(245,230,200,0.1)';
            circle.style.background = 'rgba(245,230,200,0.15)';
          }
          yearEl.style.transform = 'translateX(-50%) translateY(-6px)';
          desc.style.transform = 'translateX(-50%) translateY(-6px)';
          desc.style.opacity = '1';
        });
        slot.addEventListener('mouseleave', function() {
          if (circle) circle.style.transform = 'translate(-50%,-50%) translateY(0) scale(1)';
          if (circle) {
            circle.style.borderColor = 'rgba(180,80,60,0.7)';
            circle.style.boxShadow = '0 0 12px rgba(180,80,60,0.2),inset 0 0 8px rgba(245,230,200,0.05)';
            circle.style.background = 'rgba(245,230,200,0.08)';
          }
          yearEl.style.transform = 'translateX(-50%) translateY(0)';
          desc.style.transform = 'translateX(-50%) translateY(0)';
          desc.style.opacity = '0';
        });
      } else {
        // 无 desc 的节点，hover 也保持上移动效
        slot.addEventListener('mouseenter', function() {
          yearEl.style.transform = 'translateX(-50%) translateY(-6px)';
          if (circle) circle.style.transform = 'translate(-50%,-50%) translateY(-6px) scale(1.1)';
          if (circle) {
            circle.style.borderColor = 'rgba(220,100,80,0.95)';
            circle.style.boxShadow = '0 0 24px rgba(220,100,80,0.45),inset 0 0 12px rgba(245,230,200,0.1)';
            circle.style.background = 'rgba(245,230,200,0.15)';
          }
        });
        slot.addEventListener('mouseleave', function() {
          yearEl.style.transform = 'translateX(-50%) translateY(0)';
          if (circle) circle.style.transform = 'translate(-50%,-50%) translateY(0) scale(1)';
          if (circle) {
            circle.style.borderColor = 'rgba(180,80,60,0.7)';
            circle.style.boxShadow = '0 0 12px rgba(180,80,60,0.2),inset 0 0 8px rgba(245,230,200,0.05)';
            circle.style.background = 'rgba(245,230,200,0.08)';
          }
        });
      }

      // 点击弹窗
      if (node.detailText || node.desc) {
        slot.addEventListener('click', function(e) {
          e.stopPropagation();
          NavigationController.showPopup({
            title: node.year + ' — ' + node.label,
            body: node.detailText || node.desc,
            source: '侨批史料综合整理'
          });
        });
      }

      track.appendChild(slot);
    });
  }

  // 底部引导文字
  var hint = document.createElement('div');
  hint.style.cssText = 'position:absolute;bottom:5%;left:50%;transform:translateX(-50%);' +
    'font-family:"Noto Serif SC",serif;font-size:clamp(10px,0.65vw,12px);' +
    'color:rgba(245,230,200,0.65);text-shadow:0 0 6px rgba(245,230,200,0.3);' +
    'z-index:5;letter-spacing:0.15em;white-space:nowrap;';
  hint.textContent = '← 左右滑动浏览 / 点击节点查看详情 →';
  pageEl.appendChild(hint);

  // 底部装饰线
  var bottomLine = document.createElement('div');
  bottomLine.style.cssText = 'position:absolute;bottom:0;left:12%;right:12%;height:1px;' +
    'background:linear-gradient(90deg,transparent,rgba(245,230,200,0.15)20%,rgba(245,230,200,0.15)80%,transparent);' +
    'z-index:4;pointer-events:none;';
  pageEl.appendChild(bottomLine);
}

/**
 * Render Cards (Zone 5 — 何为侨批)
 */
function renderCards(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ========================================
  // 背景层 - 深色遮罩 (与第3页一致)
  // ========================================
  var darkOverlay = document.createElement('div');
  darkOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(8, 6, 3, 0.6) 0%,
      rgba(8, 6, 3, 0.8) 40%,
      rgba(8, 6, 3, 0.9) 100%
    );
    pointer-events: none;
  `;
  pageEl.appendChild(darkOverlay);

  // 噪声纹理层
  var brushTexture = document.createElement('div');
  brushTexture.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
  `;
  pageEl.appendChild(brushTexture);

  // Title - 深色主题金色标题，强制横排
  var title = document.createElement('h2');
  title.textContent = '何为侨批';
  title.style.cssText = `
    position: absolute;
    top: 4%;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-weight: 900;
    font-size: clamp(22px, 2vw, 36px);
    color: rgba(220, 190, 140, 0.95);
    letter-spacing: 0.25em;
    text-shadow: 0 0 20px rgba(220, 190, 140, 0.3), 0 2px 10px rgba(0,0,0,0.5);
    z-index: 10;
    text-align: center;
    writing-mode: horizontal-tb !important;
    text-orientation: mixed !important;
  `;
  pageEl.appendChild(title);

  // Cards container
  var cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards-container';
  cardsContainer.style.cssText = `
    position: absolute;
    left: 8%;
    right: 8%;
    top: 14%;
    bottom: 10%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    justify-content: center;
    z-index: 10;
  `;

  c.cards.forEach(function(card, idx) {
    // ========== 按照用户指定的HTML结构 ==========
    // <div class="card">
    //   <div class="icon">侨</div>
    //   <div class="text-group">
    //     <div class="title">标题</div>
    //     <div class="desc">描述</div>
    //   </div>
    //   <div class="arrow">▼</div>
    // </div>

    var cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.cssText = `
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background: rgba(30, 30, 35, 0.7);
      border-radius: 8px;
      margin-bottom: 1rem;
      cursor: pointer;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      border: 1px solid rgba(220, 190, 140, 0.12);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
    `;
    cardEl.style.setProperty('--stagger-index', idx);

    // Icon
    var icon = document.createElement('div');
    icon.className = 'icon';
    icon.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #a83c32;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      margin-right: 1rem;
      flex-shrink: 0;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 10px rgba(180, 60, 40, 0.35);
      font-family: 'Noto Serif SC', serif;
      font-weight: bold;
    `;
    icon.textContent = card.iconChar || '?';
    cardEl.appendChild(icon);

    // Text group
    var textGroup = document.createElement('div');
    textGroup.className = 'text-group';
    textGroup.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1;
    `;

    // Title
    var titleDiv = document.createElement('div');
    titleDiv.className = 'title';
    titleDiv.style.cssText = `
      font-size: 1.1rem;
      color: #e0e0e5;
      font-weight: bold;
      font-family: 'Noto Serif SC', serif;
      white-space: nowrap;
    `;
    titleDiv.textContent = card.title;
    textGroup.appendChild(titleDiv);

    // Desc — 合并 body 和 subtitle
    var descText = card.body;
    if (card.subtitle) {
      descText = card.body + ' | ' + card.subtitle;
    }
    var descDiv = document.createElement('div');
    descDiv.className = 'desc';
    descDiv.style.cssText = `
      font-size: 0.9rem;
      color: #b0b0b8;
      font-family: 'Noto Serif SC', serif;
      white-space: nowrap;
    `;
    descDiv.textContent = descText;
    textGroup.appendChild(descDiv);

    cardEl.appendChild(textGroup);

    // Expanded content wrapper (hidden by default)
    var expandedWrapper = null;
    if (card.expandedText) {
      expandedWrapper = document.createElement('div');
      expandedWrapper.className = 'card-expanded';
      expandedWrapper.style.cssText = `
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        opacity: 0;
        width: 100%;
      `;

      var expandedText = document.createElement('p');
      expandedText.style.cssText = `
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(12px, 0.85vw, 14px);
        color: rgba(200, 200, 210, 0.85);
        line-height: 1.9;
        padding-top: 14px;
        margin-top: 14px;
        border-top: 1px dashed rgba(220, 190, 140, 0.2);
        opacity: 0;
        transition: opacity 0.3s ease 0.1s;
      `;
      expandedText.textContent = card.expandedText;
      expandedWrapper.appendChild(expandedText);
    }

    // Arrow
    var arrow = document.createElement('div');
    arrow.className = 'arrow';
    arrow.style.cssText = `
      color: #b0b0b8;
      margin-left: 1rem;
      font-size: 1rem;
      transition: transform 0.35s ease, color 0.3s ease;
      flex-shrink: 0;
    `;
    arrow.innerHTML = '&#9660;';
    cardEl.appendChild(arrow);

    // Click to expand
    var isExpanded = false;
    if (card.expandedText) {
      cardEl.addEventListener('click', function(e) {
        e.stopPropagation();
        isExpanded = !isExpanded;

        if (isExpanded) {
          expandedWrapper.style.maxHeight = expandedWrapper.scrollHeight + 60 + 'px';
          expandedWrapper.style.opacity = '1';
          expandedWrapper.querySelector('p').style.opacity = '1';
          arrow.style.transform = 'rotate(180deg)';
          cardEl.style.boxShadow = '0 14px 40px rgba(0, 0, 0, 0.45), 0 5px 14px rgba(0, 0, 0, 0.3)';
          cardEl.style.borderColor = 'rgba(220, 190, 140, 0.3)';
        } else {
          expandedWrapper.style.maxHeight = '0';
          expandedWrapper.style.opacity = '0';
          expandedWrapper.querySelector('p').style.opacity = '0';
          arrow.style.transform = 'rotate(0deg)';
          cardEl.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
          cardEl.style.borderColor = 'rgba(220, 190, 140, 0.12)';
        }
      });
    }

    // Hover effects
    cardEl.addEventListener('mouseenter', function() {
      cardEl.style.transform = 'translateY(-4px)';
      cardEl.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)';
      icon.style.transform = 'scale(1.08)';
      icon.style.boxShadow = '0 4px 16px rgba(180, 60, 40, 0.4)';
    });
    cardEl.addEventListener('mouseleave', function() {
      cardEl.style.transform = 'translateY(0)';
      cardEl.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
      icon.style.transform = 'scale(1)';
      icon.style.boxShadow = '0 2px 10px rgba(180, 60, 40, 0.35)';
    });

    // Append expanded wrapper if exists
    if (expandedWrapper) {
      cardEl.appendChild(expandedWrapper);
    }

    cardsContainer.appendChild(cardEl);
  });

  pageEl.appendChild(cardsContainer);

  // 点击空白收起已展开的卡片
  pageEl.addEventListener('click', function(e) {
    var expandedCards = pageEl.querySelectorAll('.card');
    expandedCards.forEach(function(card) {
      var arrowEl = card.querySelector('.arrow');
      var wrapper = card.querySelector('.card-expanded');
      if (wrapper && wrapper.style.maxHeight && wrapper.style.maxHeight !== '0px') {
        wrapper.style.maxHeight = '0';
        wrapper.style.opacity = '0';
        var p = wrapper.querySelector('p');
        if (p) p.style.opacity = '0';
        if (arrowEl) {
          arrowEl.style.transform = 'rotate(0deg)';
        }
        card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        card.style.borderColor = 'rgba(220, 190, 140, 0.12)';
      }
    });
  });
}

/**
 * Render Split Screen (Zones 6, 7, 9)
 */
function renderSplitScreen(zone, pageEl) {
  var c = zone.content;
  var isTopBottom = c.splitMode === 'top-bottom';
  var isWar = zone.id === 7;
  var isUnitedFront = false;

  pageEl.style.background = 'transparent';

  if (isTopBottom) {
    // Top section (image)
    var topSection = document.createElement('div');
    topSection.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 55%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
      overflow: hidden;
    `;

    if (c.topContent && c.topContent.type === 'image') {
      var img = document.createElement('div');
      img.className = 'ship-image';
      img.style.cssText = `
        width: 80%;
        max-width: 700px;
        height: 80%;
        background: url('${c.topContent.src}') center center / contain no-repeat;
        opacity: 0.85;
        filter: sepia(0.2) contrast(1.1);
      `;
      topSection.appendChild(img);
    }

    pageEl.appendChild(topSection);

    // Bottom section (text)
    var bottomSection = document.createElement('div');
    bottomSection.style.cssText = `
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 45%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 10%;
      z-index: 5;
    `;

    if (c.bottomContent) {
      var bc = c.bottomContent;

      if (bc.title) {
        var bt = document.createElement('h2');
        bt.textContent = bc.title;
        bt.style.cssText = `
          font-family: 'Noto Serif SC', 'STKaiti', serif;
          font-weight: 900;
          font-size: clamp(24px, 2.5vw, 44px);
          color: var(--color-gold-light, #D4A574);
          letter-spacing: 0.2em;
          margin-bottom: 2%;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        bottomSection.appendChild(bt);
      }

      if (bc.subtitle) {
        var bs = document.createElement('p');
        bs.textContent = bc.subtitle;
        bs.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(12px, 0.9vw, 16px);
          color: rgba(212, 165, 116, 0.7);
          letter-spacing: 0.1em;
          margin-bottom: 2%;
          text-align: center;
        `;
        bottomSection.appendChild(bs);
      }

      if (bc.body) {
        var bb = document.createElement('p');
        bb.textContent = bc.body;
        bb.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(11px, 0.75vw, 14px);
          color: rgba(245, 230, 200, 0.7);
          line-height: 1.8;
          text-align: center;
          max-width: 80%;
        `;
        bottomSection.appendChild(bb);
      }
    }

    pageEl.appendChild(bottomSection);

    // Hotspots for top-bottom split zones
    if (zone.hotspots) {
      zone.hotspots.forEach(function(hs) {
        var btn = document.createElement('button');
        btn.className = 'hotspot-btn';
        btn.textContent = hs.label;
        btn.style.cssText = `
          position: absolute;
          bottom: 5%;
          right: 5%;
          z-index: 10;
          padding: 8px 16px;
          background: rgba(212, 165, 116, 0.15);
          border: 1px solid var(--color-gold, #C9A96E);
          border-radius: 4px;
          color: var(--color-gold-light, #D4A574);
          cursor: pointer;
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(11px, 0.7vw, 13px);
          transition: all 0.3s ease;
        `;
        btn.addEventListener('mouseenter', function() {
          this.style.background = 'rgba(212, 165, 116, 0.3)';
        });
        btn.addEventListener('mouseleave', function() {
          this.style.background = 'rgba(212, 165, 116, 0.15)';
        });
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          NavigationController.showPopup({
            title: hs.label,
            body: hs.popupContent || '详细内容',
            source: '侨批文化研究'
          });
        });
        pageEl.appendChild(btn);
      });
    }

  } else {
    // ================================================================
    // Zone 7 — 华侨与抗战：深色主题（与第1、3页完全一致）
    // ================================================================

    // 深色背景底色
    var bgBase = document.createElement('div');
    bgBase.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      background: #1a1a1d;
      pointer-events: none;
    `;
    pageEl.appendChild(bgBase);

    // 深色渐变遮罩（rgba(0,0,0,0.75)）
    var darkOverlay = document.createElement('div');
    darkOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(
        to bottom,
        rgba(8, 6, 3, 0.5) 0%,
        rgba(8, 6, 3, 0.75) 40%,
        rgba(8, 6, 3, 0.88) 100%
      );
      pointer-events: none;
    `;
    pageEl.appendChild(darkOverlay);

    // 噪声纹理层
    var brushTexture = document.createElement('div');
    brushTexture.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 2;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      pointer-events: none;
    `;
    pageEl.appendChild(brushTexture);

    // 页面顶部居中主标题（#e6d5b8，与第3页一致）
    var topTitle = document.createElement('h2');
    topTitle.style.cssText = `
      position: absolute;
      top: 4%;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Noto Serif SC', 'STKaiti', serif;
      font-weight: 900;
      font-size: clamp(22px, 2.2vw, 40px);
      color: #e6d5b8;
      letter-spacing: 0.2em;
      text-shadow: 0 0 20px rgba(230, 213, 184, 0.2), 0 2px 10px rgba(0,0,0,0.5);
      z-index: 10;
      text-align: center;
      white-space: nowrap;
    `;
    topTitle.textContent = '烽火侨批';
    pageEl.appendChild(topTitle);

    // 左右分栏容器
    var splitWrap = document.createElement('div');
    splitWrap.style.cssText = `
      position: absolute;
      left: 10%;
      right: 10%;
      top: 14%;
      bottom: 10%;
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 3%;
      z-index: 10;
    `;
    pageEl.appendChild(splitWrap);

    // ==================== 左侧内容 ====================
    var lc = c.leftContent;
    if (lc) {
      var leftCol = document.createElement('div');
      leftCol.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      `;

      // 副标题（#e0e0e5）
      if (lc.subtitle) {
        var ls = document.createElement('p');
        ls.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(12px, 0.85vw, 15px);
          color: #e0e0e5;
          letter-spacing: 0.12em;
          text-align: center;
          line-height: 1.8;
          max-width: 90%;
          opacity: 0.8;
        `;
        ls.textContent = lc.subtitle;
        leftCol.appendChild(ls);
      }

      // 正文（#e0e0e5）
      if (lc.body) {
        var lb = document.createElement('p');
        lb.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(11px, 0.75vw, 13px);
          color: #e0e0e5;
          line-height: 2.2;
          text-align: center;
          max-width: 88%;
          opacity: 0.7;
        `;
        lb.textContent = lc.body;
        leftCol.appendChild(lb);
      }

      // 数据卡片（半透明深色底，浅米白字）
      if (lc.highlight) {
        var hlCard = document.createElement('div');
        hlCard.style.cssText = `
          margin-top: 8px;
          padding: 18px 28px;
          background: rgba(30, 30, 35, 0.7);
          border: 1px solid rgba(224, 224, 229, 0.22);
          border-radius: 10px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          text-align: center;
        `;
        var hlText = document.createElement('div');
        hlText.style.cssText = `
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(14px, 1.1vw, 20px);
          font-weight: 700;
          color: #e0e0e5;
          letter-spacing: 0.12em;
        `;
        hlText.textContent = lc.highlight;
        hlCard.appendChild(hlText);

        if (lc.highlightSource) {
          var hsText = document.createElement('div');
          hsText.style.cssText = `
            font-family: 'Noto Serif SC', serif;
            font-size: clamp(10px, 0.65vw, 12px);
            color: rgba(224, 224, 229, 0.45);
            margin-top: 8px;
            letter-spacing: 0.06em;
          `;
          hsText.textContent = lc.highlightSource;
          hlCard.appendChild(hsText);
        }
        leftCol.appendChild(hlCard);
      }

      splitWrap.appendChild(leftCol);
    }

    // ==================== 右侧按钮列表 ====================
    var rc = c.rightContent;
    if (rc && rc.items) {
      var rightCol = document.createElement('div');
      rightCol.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
      `;

      rc.items.forEach(function(item) {
        var btn = document.createElement('button');
        btn.className = 'hotspot-btn';
        btn.style.cssText = `
          width: 88%;
          padding: 16px 22px;
          background: rgba(30, 30, 35, 0.6);
          border: 1px solid rgba(224, 224, 229, 0.22);
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Noto Serif SC', serif;
          font-size: clamp(12px, 0.8vw, 14px);
          color: #e0e0e5;
          letter-spacing: 0.1em;
          transition: all 0.3s ease;
          text-align: center;
          line-height: 1.5;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        `;
        btn.textContent = item.label;

        btn.addEventListener('mouseenter', function() {
          this.style.background = 'rgba(220, 190, 140, 0.1)';
          this.style.borderColor = 'rgba(224, 224, 229, 0.5)';
          this.style.color = '#e6d5b8';
          this.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(220, 190, 140, 0.08)';
          this.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseleave', function() {
          this.style.background = 'rgba(30, 30, 35, 0.6)';
          this.style.borderColor = 'rgba(224, 224, 229, 0.22)';
          this.style.color = '#e0e0e5';
          this.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
          this.style.transform = 'translateY(0)';
        });
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          NavigationController.showPopup({
            title: item.title || item.label,
            body: item.desc || '',
            source: item.source || ''
          });
        });

        rightCol.appendChild(btn);
      });

      splitWrap.appendChild(rightCol);
    }
  }
}

/**
 * Render Data Visual (Zone 8)
 */
function renderDataVisual(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ================================================================
  // 轮播图片列表
  // ================================================================
  var bgImages = [
    'images/image4.png',
    'images/image5.png',
    'images/image6.png'
  ];

  // ================================================================
  // 深色背景层
  // ================================================================

  // 深灰底色（防止轮播图片加载前闪白）
  var bgBase = document.createElement('div');
  bgBase.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 0;',
    'background: #1a1a1d;',
    'pointer-events: none;'
  ].join(' ');
  pageEl.appendChild(bgBase);

  // ================================================================
  // 全屏轮播容器
  // ================================================================
  var carousel = document.createElement('div');
  carousel.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 1;',
    'overflow: hidden;'
  ].join(' ');
  pageEl.appendChild(carousel);

  // 逐张创建幻灯片
  bgImages.forEach(function(src, i) {
    var slide = document.createElement('div');
    slide.style.cssText = [
      'position: absolute;',
      'inset: 0;',
      'width: 100%;',
      'height: 100%;',
      'opacity: ' + (i === 0 ? 1 : 0) + ';',
      'transition: opacity 1s ease-in-out;',
      'background-image: url("' + src + '");',
      'background-size: cover;',
      'background-position: center center;',
      'background-repeat: no-repeat;',
      'filter: grayscale(100%) brightness(0.45) contrast(1.1) sepia(0.2);',
      'pointer-events: none;'
    ].join(' ');
    carousel.appendChild(slide);
  });

  // 轮播控制变量
  var currentSlide = 0;
  var slides = carousel.querySelectorAll('div');

  function nextSlide() {
    slides[currentSlide].style.opacity = '0';
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].style.opacity = '1';
  }

  setInterval(nextSlide, 4000);

  // ================================================================
  // 深色遮罩层（压暗照片，确保前景清晰可读）
  // ================================================================
  var darkOverlay = document.createElement('div');
  darkOverlay.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 2;',
    'background: linear-gradient(to bottom, rgba(8, 6, 3, 0.65) 0%, rgba(8, 6, 3, 0.82) 40%, rgba(8, 6, 3, 0.92) 100%);',
    'pointer-events: none;'
  ].join(' ');
  pageEl.appendChild(darkOverlay);

  // ================================================================
  // 主标题 — 金色呼吸动画
  // ================================================================
  var titleWrap = document.createElement('div');
  titleWrap.style.cssText = [
    'position: absolute;',
    'top: 4%;',
    'left: 50%;',
    'transform: translateX(-50%);',
    'z-index: 10;',
    'white-space: nowrap;'
  ].join(' ');

  var title = document.createElement('h2');
  title.textContent = c.title || '经济血脉';
  title.style.cssText = [
    "font-family: 'Noto Serif SC', 'STKaiti', serif;",
    'font-weight: 900;',
    'font-size: clamp(22px, 2.2vw, 40px);',
    'color: #e6d5b8;',
    'letter-spacing: 0.2em;',
    'text-align: center;',
    'text-shadow: 0 0 12px rgba(230, 213, 184, 0.5), 0 0 30px rgba(201, 169, 110, 0.3), 0 2px 10px rgba(0,0,0,0.5);',
    'animation: breathe 3s ease-in-out infinite, fadeInText 0.8s ease forwards;'
  ].join(' ');
  titleWrap.appendChild(title);
  pageEl.appendChild(titleWrap);

  // ================================================================
  // 2x2 数据卡片网格
  // ================================================================
  var dataContainer = document.createElement('div');
  dataContainer.style.cssText = [
    'position: absolute;',
    'left: 10%;',
    'right: 10%;',
    'top: 16%;',
    'bottom: 8%;',
    'display: grid;',
    'grid-template-columns: repeat(2, 1fr);',
    'gap: 20px;',
    'z-index: 10;',
    'align-content: center;',
    'align-items: center;'
  ].join(' ');

  c.dataPoints.forEach(function(dp, idx) {
    var item = document.createElement('div');
    item.style.cssText = [
      'background: rgba(15, 15, 18, 0.8);',
      'border: 1px solid rgba(220, 190, 140, 0.2);',
      'border-radius: 10px;',
      'padding: 20px 24px;',
      'backdrop-filter: blur(10px);',
      'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);',
      'cursor: pointer;',
      'transition: all 0.35s ease;',
      'opacity: 0;',
      'transform: translateY(16px);',
      'animation: fadeInDataCard 0.6s ease forwards;',
      'animation-delay: ' + (idx * 150 + 200) + 'ms;'
    ].join(' ');

    var valueEl = document.createElement('div');
    valueEl.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-weight: 900;',
      'font-size: clamp(26px, 2.4vw, 42px);',
      'color: #e6d5b8;',
      'line-height: 1.2;',
      'text-shadow: 0 0 8px rgba(230, 213, 184, 0.5), 0 0 20px rgba(201, 169, 110, 0.25);'
    ].join(' ');
    valueEl.textContent = dp.value + (dp.unit ? ' ' + dp.unit : '');
    item.appendChild(valueEl);

    var labelEl = document.createElement('div');
    labelEl.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-size: clamp(12px, 0.85vw, 15px);',
      'color: #e0e0e5;',
      'margin-top: 8px;',
      'line-height: 1.5;',
      'text-shadow: 0 0 6px rgba(224, 224, 229, 0.15);'
    ].join(' ');
    labelEl.textContent = dp.label;
    item.appendChild(labelEl);

    if (dp.description) {
      var descEl = document.createElement('div');
      descEl.style.cssText = [
        "font-family: 'Noto Serif SC', serif;",
        'font-size: clamp(10px, 0.68vw, 12px);',
        'color: rgba(224, 224, 229, 0.6);',
        'margin-top: 6px;',
        'line-height: 1.6;',
        'text-shadow: 0 0 6px rgba(224, 224, 229, 0.1);'
      ].join(' ');
      descEl.textContent = dp.description;
      item.appendChild(descEl);
    }

    item.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(25, 25, 30, 0.9)';
      this.style.borderColor = 'rgba(220, 190, 140, 0.45)';
      this.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px rgba(201, 169, 110, 0.1)';
      this.style.transform = 'translateY(-3px)';
    });
    item.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(15, 15, 18, 0.8)';
      this.style.borderColor = 'rgba(220, 190, 140, 0.2)';
      this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
      this.style.transform = 'translateY(0)';
    });

    item.addEventListener('click', function(e) {
      e.stopPropagation();
      NavigationController.showPopup({
        title: dp.label,
        body: dp.description || '',
        source: dp.source || ''
      });
    });

    dataContainer.appendChild(item);
  });

  pageEl.appendChild(dataContainer);

  // 底部金色分隔线
  var goldLine = document.createElement('div');
  goldLine.style.cssText = [
    'position: absolute;',
    'bottom: 3%;',
    'left: 15%;',
    'right: 15%;',
    'height: 1px;',
    'background: linear-gradient(90deg, transparent, rgba(230, 213, 184, 0.3), transparent);',
    'z-index: 3;',
    'pointer-events: none;'
  ].join(' ');
  pageEl.appendChild(goldLine);
}

/**
 * Render Stars (Zone 10)
 */
function renderStars(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ================================================================
  // 深邃宇宙背景层（与前后深色页面无缝衔接）
  // ================================================================

  // 深黑底色
  var bgBase = document.createElement('div');
  bgBase.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 0;
    background: #050508;
    pointer-events: none;
  `;
  pageEl.appendChild(bgBase);

  // 深蓝黑渐变遮罩
  var cosmicOverlay = document.createElement('div');
  cosmicOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(8, 9, 26, 0.6) 0%,
      rgba(10, 11, 30, 0.85) 50%,
      rgba(8, 9, 26, 0.6) 100%
    );
    pointer-events: none;
  `;
  pageEl.appendChild(cosmicOverlay);

  // 噪声纹理层
  var brushTexture = document.createElement('div');
  brushTexture.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
  `;
  pageEl.appendChild(brushTexture);

  // ================================================================
  // 宇宙星空粒子
  // ================================================================
  var starsBg = document.createElement('div');
  starsBg.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 3;
  `;
  pageEl.appendChild(starsBg);
  Effects.createStars(starsBg, 60);

  // 添加几颗大亮星（闪烁不同步）
  for (var b = 0; b < 4; b++) {
    var bigStar = document.createElement('div');
    bigStar.className = 'big-star';
    bigStar.style.cssText = `
      position: absolute;
      z-index: 4;
      pointer-events: none;
    `;
    bigStar.style.width = (4 + Math.random() * 6) + 'px';
    bigStar.style.height = bigStar.style.width;
    bigStar.style.left = (5 + Math.random() * 90) + '%';
    bigStar.style.top = (5 + Math.random() * 85) + '%';
    pageEl.appendChild(bigStar);
  }

  // ================================================================
  // 主标题 — 金色发光呼吸
  // ================================================================
  var titleWrap = document.createElement('div');
  titleWrap.style.cssText = `
    position: absolute;
    top: 3.5%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    white-space: nowrap;
  `;

  var title = document.createElement('h2');
  title.textContent = c.title || '人物星河';
  title.style.cssText = `
    font-family: 'Noto Serif SC', 'STKaiti', serif;
    font-weight: 900;
    font-size: clamp(20px, 2vw, 38px);
    color: #e6d5b8;
    letter-spacing: 0.3em;
    text-align: center;
    text-shadow:
      0 0 12px rgba(230, 213, 184, 0.5),
      0 0 30px rgba(201, 169, 110, 0.3),
      0 2px 10px rgba(0,0,0,0.5);
    animation: breathe 3s ease-in-out infinite, fadeInText 0.8s ease forwards;
  `;
  titleWrap.appendChild(title);
  pageEl.appendChild(titleWrap);

  // ================================================================
  // 副标题 — 浅米白
  // ================================================================
  if (c.subtitle) {
    var subWrap = document.createElement('div');
    subWrap.style.cssText = `
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      white-space: nowrap;
    `;
    var sub = document.createElement('p');
    sub.textContent = c.subtitle;
    sub.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(10px, 0.65vw, 13px);
      color: #e0e0e5;
      letter-spacing: 0.2em;
      opacity: 0.6;
      text-shadow: 0 0 8px rgba(224, 224, 229, 0.15);
    `;
    subWrap.appendChild(sub);
    pageEl.appendChild(subWrap);
  }

  // ================================================================
  // 五颗人物星 — 宇宙星球风格
  // ================================================================
  var positions = [
    { x: 18, y: 38, scale: 1.0, delay: 0.0, floatDur: 4.0 },
    { x: 48, y: 22, scale: 1.15, delay: 0.15, floatDur: 4.5 },
    { x: 78, y: 42, scale: 0.9, delay: 0.3, floatDur: 3.5 },
    { x: 25, y: 68, scale: 1.05, delay: 0.45, floatDur: 5.0 },
    { x: 65, y: 72, scale: 0.95, delay: 0.6, floatDur: 4.2 }
  ];

  c.figures.forEach(function(fig, idx) {
    var pos = positions[idx];
    var jitterX = (Math.random() - 0.5) * 6;
    var jitterY = (Math.random() - 0.5) * 6;
    var starSize = Math.floor(70 * pos.scale);

    var figEl = document.createElement('div');
    figEl.className = 'star-figure';
    figEl.setAttribute('data-figure-id', fig.id);
    figEl.style.cssText = `
      position: absolute;
      left: ${pos.x + jitterX}%;
      top: ${pos.y + jitterY}%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      z-index: 15;
      opacity: 0;
      animation:
        starAppear 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${pos.delay}s forwards,
        starFloat ${pos.floatDur}s ease-in-out ${pos.delay + 0.5}s infinite;
    `;

    // 外层金色光晕
    var outerGlow = document.createElement('div');
    outerGlow.style.cssText = `
      position: absolute;
      width: ${starSize + 50}px;
      height: ${starSize + 50}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 40%, transparent 70%);
      animation: glowPulse ${2.5 + Math.random() * 1.5}s ease-in-out ${Math.random() * 2}s infinite;
      pointer-events: none;
    `;
    figEl.appendChild(outerGlow);

    // 主体星形球 — 半透明深色 + 金色边框
    var portrait = document.createElement('div');
    portrait.className = 'star-orb';
    portrait.style.cssText = `
      width: ${starSize}px;
      height: ${starSize}px;
      border-radius: 50%;
      background: rgba(20, 20, 30, 0.7);
      border: 1.5px solid rgba(220, 190, 140, 0.45);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Noto Serif SC', serif;
      font-weight: 900;
      font-size: ${Math.floor(starSize * 0.38)}px;
      color: #e6d5b8;
      text-shadow: 0 0 12px rgba(230, 213, 184, 0.6);
      box-shadow:
        0 0 ${starSize * 0.25}px rgba(201, 169, 110, 0.35),
        0 0 ${starSize * 0.5}px rgba(201, 169, 110, 0.15),
        inset 0 0 ${starSize * 0.3}px rgba(230, 213, 184, 0.06);
      transition: all 0.35s ease;
      position: relative;
    `;
    portrait.textContent = fig.iconChar || '★';
    figEl.appendChild(portrait);

    // 名字 — 浅米白
    var nameEl = document.createElement('div');
    nameEl.textContent = fig.name;
    nameEl.style.cssText = `
      margin-top: ${starSize * 0.15}px;
      font-family: 'Noto Serif SC', serif;
      font-weight: 700;
      font-size: clamp(11px, 0.8vw, 15px);
      color: #e0e0e5;
      text-align: center;
      letter-spacing: 0.08em;
      text-shadow: 0 0 8px rgba(224, 224, 229, 0.2);
      white-space: nowrap;
    `;
    figEl.appendChild(nameEl);

    // 标签 — 浅米白弱发光
    var tagEl = document.createElement('div');
    tagEl.textContent = fig.tag;
    tagEl.style.cssText = `
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(8px, 0.45vw, 10px);
      color: rgba(224, 224, 229, 0.55);
      text-align: center;
      margin-top: 2px;
      white-space: nowrap;
      text-shadow: 0 0 6px rgba(224, 224, 229, 0.1);
    `;
    figEl.appendChild(tagEl);

    // Hover 悬停效果
    figEl.addEventListener('mouseenter', function() {
      this.style.zIndex = '20';
      var orb = this.querySelector('.star-orb');
      if (orb) {
        orb.style.boxShadow = '0 0 40px rgba(201, 169, 110, 0.5), 0 0 80px rgba(201, 169, 110, 0.25), inset 0 0 30px rgba(230, 213, 184, 0.12)';
        orb.style.borderColor = 'rgba(220, 190, 140, 0.8)';
        orb.style.background = 'rgba(30, 30, 40, 0.85)';
        orb.style.color = '#ffe9b8';
        orb.style.textShadow = '0 0 20px rgba(230, 213, 184, 0.8)';
      }
    });
    figEl.addEventListener('mouseleave', function() {
      this.style.zIndex = '15';
      var orb = this.querySelector('.star-orb');
      if (orb) {
        orb.style.boxShadow = '0 0 ' + (starSize * 0.25) + 'px rgba(201, 169, 110, 0.35), 0 0 ' + (starSize * 0.5) + 'px rgba(201, 169, 110, 0.15), inset 0 0 ' + (starSize * 0.3) + 'px rgba(230, 213, 184, 0.06)';
        orb.style.borderColor = 'rgba(220, 190, 140, 0.45)';
        orb.style.background = 'rgba(20, 20, 30, 0.7)';
        orb.style.color = '#e6d5b8';
        orb.style.textShadow = '0 0 12px rgba(230, 213, 184, 0.6)';
      }
    });

    // 点击弹窗
    figEl.addEventListener('click', function(e) {
      e.stopPropagation();
      var figureId = this.getAttribute('data-figure-id');
      var figure = c.figures.find(function(f) { return f.id === figureId; });
      if (figure) {
        NavigationController.showPopup({
          title: figure.name + ' —— ' + figure.tag,
          body: figure.story,
          source: '侨批文化研究 / 历史资料'
        });
        if (STATE.zoneStates[9].viewedFigures.indexOf(figure.id) === -1) {
          STATE.zoneStates[9].viewedFigures.push(figure.id);
        }
      }
    });

    pageEl.appendChild(figEl);
  });

  // 底部提示文字
  var constellationLine = document.createElement('div');
  constellationLine.style.cssText = `
    position: absolute;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Noto Serif SC', serif;
    font-size: clamp(10px, 0.6vw, 12px);
    color: rgba(201, 169, 110, 0.3);
    z-index: 10;
    letter-spacing: 0.1em;
    opacity: 0;
    animation: fadeIn 1.5s ease 2s forwards;
    pointer-events: none;
  `;
  constellationLine.textContent = '点击星辉 · 阅览人生';
  pageEl.appendChild(constellationLine);
}

/**
 * Render Splash (Zone 11)
 */
function renderSplash(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ================================================================
  // 全屏背景图（image8）
  // ================================================================
  var bgImg = document.createElement('div');
  bgImg.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 0;',
    'background-image: url("images/image8.png");',
    'background-size: cover;',
    'background-position: center center;',
    'background-repeat: no-repeat;',
    'filter: grayscale(100%) brightness(0.45) contrast(1.05) sepia(0.15);'
  ].join(' ');
  pageEl.appendChild(bgImg);

  // 深色渐变遮罩（压暗背景，与首页遮罩一致）
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 1;',
    'background: linear-gradient(to bottom, rgba(8, 6, 3, 0.5) 0%, rgba(6, 5, 2, 0.65) 50%, rgba(8, 6, 3, 0.5) 100%);'
  ].join(' ');
  pageEl.appendChild(overlay);

  // 噪声纹理
  var texture = document.createElement('div');
  texture.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 2;',
    'opacity: 0.025;',
    'background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.04\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E");',
    'pointer-events: none;'
  ].join(' ');
  pageEl.appendChild(texture);

  // ================================================================
  // 内容层（居中布局，与首页一致）
  // ================================================================
  var content = document.createElement('div');
  content.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 3;',
    'display: flex;',
    'flex-direction: column;',
    'align-items: center;',
    'justify-content: center;',
    'text-align: center;',
    'padding: 8% 10%;'
  ].join(' ');
  pageEl.appendChild(content);

  // 主标题 — 金色发光
  var title = document.createElement('h2');
  title.textContent = c.title || '纸短情长·精神永续';
  title.style.cssText = [
    "font-family: 'Noto Serif SC', 'STKaiti', serif;",
    'font-weight: 900;',
    'font-size: clamp(24px, 2.5vw, 48px);',
    'color: #e6d5b8;',
    'letter-spacing: 0.18em;',
    'text-shadow: 0 0 12px rgba(230, 213, 184, 0.55), 0 0 30px rgba(201, 169, 110, 0.3), 0 2px 10px rgba(0,0,0,0.6);',
    'animation: breathe 3s ease-in-out infinite, fadeInText 0.8s ease forwards;',
    'margin-bottom: 2%;'
  ].join(' ');
  content.appendChild(title);

  // 副标题 — 浅米白
  if (c.subtitle) {
    var sub = document.createElement('p');
    sub.textContent = c.subtitle;
    sub.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-size: clamp(12px, 0.85vw, 16px);',
      'color: #e0e0e5;',
      'opacity: 0.75;',
      'letter-spacing: 0.15em;',
      'text-shadow: 0 0 8px rgba(224, 224, 229, 0.2);',
      'margin-bottom: 4%;'
    ].join(' ');
    content.appendChild(sub);
  }

  // 正文 — 浅米白
  if (c.body) {
    var body = document.createElement('p');
    body.textContent = c.body;
    body.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-size: clamp(13px, 0.9vw, 17px);',
      'color: #e0e0e5;',
      'line-height: 2;',
      'max-width: 70%;',
      'opacity: 0.8;',
      'text-shadow: 0 0 6px rgba(224, 224, 229, 0.15);'
    ].join(' ');
    content.appendChild(body);
  }

  // 引用 — 金色边框 + 浅米白文字
  if (c.quote) {
    var quote = document.createElement('blockquote');
    quote.textContent = c.quote;
    quote.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-size: clamp(14px, 1vw, 20px);',
      'color: #e6d5b8;',
      'line-height: 1.8;',
      'max-width: 60%;',
      'margin-top: 3%;',
      'padding: 16px 24px;',
      'border-top: 1px solid rgba(201, 169, 110, 0.4);',
      'border-bottom: 1px solid rgba(201, 169, 110, 0.4);',
      'font-style: italic;',
      'text-shadow: 0 0 8px rgba(230, 213, 184, 0.25);'
    ].join(' ');
    content.appendChild(quote);
  }

  // 引用出处 — 浅米白弱发光
  if (c.quoteSource) {
    var qs = document.createElement('p');
    qs.textContent = c.quoteSource;
    qs.style.cssText = [
      "font-family: 'Noto Serif SC', serif;",
      'font-size: clamp(10px, 0.65vw, 12px);',
      'color: #e0e0e5;',
      'opacity: 0.45;',
      'text-shadow: 0 0 6px rgba(224, 224, 229, 0.1);',
      'margin-top: 1%;'
    ].join(' ');
    content.appendChild(qs);
  }
}

/**
 * Render Ending (Zone 12)
 */
function renderEnding(zone, pageEl) {
  var c = zone.content;
  pageEl.style.background = 'transparent';

  // ================================================================
  // 全屏背景图（image9）
  // ================================================================
  var bgImg = document.createElement('div');
  bgImg.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 0;',
    'background-image: url("images/image9.png");',
    'background-size: cover;',
    'background-position: center center;',
    'background-repeat: no-repeat;',
    'filter: grayscale(100%) brightness(0.4) contrast(1.1) sepia(0.2);'
  ].join(' ');
  pageEl.appendChild(bgImg);

  // 深色渐变遮罩（与首页遮罩一致）
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 1;',
    'background: linear-gradient(to bottom, rgba(8, 6, 3, 0.45) 0%, rgba(6, 5, 2, 0.6) 50%, rgba(8, 6, 3, 0.45) 100%);'
  ].join(' ');
  pageEl.appendChild(overlay);

  // 噪声纹理
  var texture = document.createElement('div');
  texture.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 2;',
    'opacity: 0.025;',
    'background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.04\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E");',
    'pointer-events: none;'
  ].join(' ');
  pageEl.appendChild(texture);

  // 内容层
  var content = document.createElement('div');
  content.style.cssText = [
    'position: absolute;',
    'inset: 0;',
    'z-index: 3;',
    'display: flex;',
    'flex-direction: column;',
    'align-items: center;',
    'justify-content: center;',
    'text-align: center;',
    'padding: 8% 10%;'
  ].join(' ');
  pageEl.appendChild(content);

  // Headline
  if (c.headline) {
    var h = document.createElement('h2');
    h.textContent = c.headline;
    h.style.cssText = `
      position: relative;
      z-index: 3;
      font-family: 'Noto Serif SC', 'STKaiti', serif;
      font-weight: 900;
      font-size: clamp(24px, 2.2vw, 40px);
      color: var(--color-gold-light, #D4A574);
      letter-spacing: 0.15em;
      text-align: center;
      text-shadow: 0 0 20px rgba(0,0,0,0.7), 0 0 40px rgba(201,169,110,0.2);
      animation: breathe 3s ease-in-out infinite;
    `;
    content.appendChild(h);
  }

  if (c.subtitle) {
    var subt = document.createElement('p');
    subt.textContent = c.subtitle;
    subt.style.cssText = `
      position: relative;
      z-index: 3;
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(13px, 0.9vw, 17px);
      color: rgba(212, 165, 116, 0.65);
      letter-spacing: 0.2em;
      margin-top: 2%;
      text-align: center;
      text-shadow: 0 0 10px rgba(0,0,0,0.5);
    `;
    content.appendChild(subt);
  }

  // Credits
  if (c.credits) {
    var creditContainer = document.createElement('div');
    creditContainer.style.cssText = `
      position: absolute;
      bottom: 15%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 3;
      text-align: center;
      opacity: 0;
      animation: fadeIn 2s ease 1s forwards;
    `;

    c.credits.forEach(function(line) {
      var p = document.createElement('p');
      p.className = 'credit-line';
      p.textContent = line;
      p.style.cssText = `
        font-family: 'Noto Serif SC', serif;
        font-size: clamp(11px, 0.75vw, 14px);
        color: rgba(212, 165, 116, 0.5);
        line-height: 1.8;
        letter-spacing: 0.08em;
      `;
      if (line.indexOf('——') !== -1) {
        p.style.opacity = '0.3';
        p.style.fontSize = 'clamp(9px, 0.55vw, 11px)';
      }
      creditContainer.appendChild(p);
    });

    content.appendChild(creditContainer);
  }
}

// =======================================================================
// Zone-specific Initializations
// =======================================================================

/**
 * Init Cover (Zone 1) — show enter hint after 5 seconds
 */
function initCoverPage(pageEl) {
  var hint = pageEl.querySelector('#enter-hint');
  if (hint) {
    setTimeout(function() {
      hint.classList.add('show');
    }, 5000);
  }
}

/**
 * Init Envelope (Zone 2) — 信封展开交互
 * 新版本：renderEnvelope 已包含所有交互逻辑，此函数仅用于初始化状态
 */
function initEnvelopePage(pageEl) {
  // 重置展开状态
  STATE.zoneStates[2] = { isOpened: false, isRevealed: false };
  // 信封卡片已由 renderEnvelope 中的事件监听器处理
}

/**
 * Init Character (Zone 3) — show annotation after 6s
 */
function initCharacterPage(pageEl) {
  var annotation = pageEl.querySelector('#nan-annotation');
  if (annotation) {
    setTimeout(function() {
      annotation.style.opacity = '1';
      STATE.zoneStates[3].isAnnotated = true;
    }, 6000);
  }
}

/**
 * Init Timeline (Zone 4) — auto scroll
 */
function initTimelinePage(pageEl) {
  var scrollContainer = pageEl.querySelector('#timeline-scroll');
  if (!scrollContainer) return;

  // 新设计使用原生滚动条，添加滚动监听更新指示器
  var updateScrollIndicator = function() {
    var nodes = pageEl.querySelectorAll('.timeline-node-wrapper');
    if (nodes.length === 0) return;

    var scrollLeft = scrollContainer.scrollLeft;
    var maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    var progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    var activeIndex = Math.min(Math.floor(progress * nodes.length), nodes.length - 1);

    // 更新节点高亮
    nodes.forEach(function(node, idx) {
      var icon = node.querySelector('.timeline-icon');
      if (icon) {
        if (idx === activeIndex) {
          icon.style.background = 'linear-gradient(135deg, #A52A2A, #8B0000)';
          icon.style.color = '#F5E6C8';
          icon.style.transform = 'scale(1.1)';
        } else {
          icon.style.background = 'linear-gradient(135deg, #F5E6C8, #EDD9B0)';
          icon.style.color = '#A52A2A';
          icon.style.transform = 'scale(1)';
        }
      }
    });
  };

  // 监听滚动事件
  scrollContainer.addEventListener('scroll', updateScrollIndicator);

  // 初始状态
  setTimeout(updateScrollIndicator, 100);
}

/** 更新时间轴进度点 */
function updateTimelineDots(pageEl, currentX, maxX) {
  var dots = pageEl.querySelectorAll('.progress-dot');
  if (dots.length === 0 || maxX <= 0) return;
  var progress = Math.min(currentX / maxX, 1);
  var activeIdx = Math.min(Math.floor(progress * dots.length), dots.length - 1);
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === activeIdx);
  });
}

/**
 * Init Cards (Zone 5) — stagger entrance
 */
function initCardsPage(pageEl) {
  var cards = pageEl.querySelectorAll('.card');
  if (cards.length > 0) {
    Effects.staggerElements(cards, 500);
  }
}

/**
 * Init War (Zone 7) — brighten effect
 */
function initWarPage(pageEl) {
  pageEl.style.filter = 'brightness(0.6)';
  setTimeout(function() {
    pageEl.style.transition = 'filter 2s ease';
    pageEl.style.filter = 'brightness(1)';
  }, 300);
}

/**
 * Init Economy (Zone 8) — data flow
 */
function initEconomyPage(pageEl) {
  var dataPoints = pageEl.querySelectorAll('.data-point');
  if (dataPoints.length > 0) {
    Effects.animateDataFlow(pageEl);
  }
}

/**
 * Init Stars (Zone 9) — check viewed status
 */
function initStarsPage(pageEl) {
  STATE.zoneStates[9].viewedFigures = [];
  STATE.zoneStates[9].activeFigure = null;
}

/**
 * Init Ending (Zone 11) — auto dim after 15s
 */
function initEndingPage(pageEl) {
  // 不再自动黑屏
}

// ===== Start Application =====
window.addEventListener('DOMContentLoaded', init);

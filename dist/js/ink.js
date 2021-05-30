function isClickedRightSide(width, x) {
  return x > width / 3;
}

function goTo(clickEvent) {
  clickEvent.stopPropagation();
  var href = clickEvent.target.getAttribute('data-href');
  window.location = href;
}

var defaultFontSize = 1;
var maxAgeFontSizeCookie = 946080000; //fontSize有效期为30年 30*60*60*24*365
var curFontSize = 1;  //单位：em
var step = window.innerWidth; //一次翻页的长度
var navbarHeight = 30; // 单位: px

function initFontSize() {
  var cookies = document.cookie;
  if (!cookies) {
    return defaultFontSize;
  }
  var r1 = cookies.split('; ');
  if (r1.length <= 0) {
    return defaultFontSize;
  }

  for (var i = 0; i < r1.length; i++) {
    var r2 = r1[i].split('=');
    if (r2[0] === 'fontSize') {
      return parseFloat(r2[1]);
    }
  }

  return defaultFontSize;
}

function setFontSize(fontSize) {
  if (fontSize < 1) {
    fontSize = 1;
  }
  var cookie = 'fontSize=' + fontSize + '; path=/ink ; max-age=' + maxAgeFontSizeCookie;
  document.cookie = cookie;
  curFontSize = fontSize;
}

function initNavbarHeight() {
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var navbarStyle = window.getComputedStyle(navbar);
    navbarHeight = getPxValue(navbarStyle.height);
  }
}

function disableScrollBottom(elem, disable) {
  if (disable) {
    elem.className = 'disabledAnchor toRight';
  } else {
    elem.className = 'toRight';
  }
}

function updateScrollDownBottomStatus() {
  var scrollDownBottom = document.getElementById('scrollDown');
  if (!scrollDownBottom) {
    return;
  }

  var scrollBox = document.getElementById('scrollBox');
  if (!scrollBox) {
    return;
  }

  scrollDownBottom.setAttribute('data-action', 'scroll');

  var maxScrollTop = scrollBox.scrollHeight - step;
  var disable = Math.abs(scrollBox.scrollTop - maxScrollTop) < 1;
  if (disable) {
    var bookchapter = document.getElementById('bookchapter');
    if (bookchapter) {
      var dataHref = scrollDownBottom.getAttribute('data-href');
      if (dataHref) {
        disable = false;

        scrollDownBottom.setAttribute('data-action', 'openurl');
      }
    }
  }

  disableScrollBottom(scrollDownBottom, disable);
}

function updateScrollUpBottomStatus() {
  var scrollUpBottom = document.getElementById('scrollUp');
  if (!scrollUpBottom) {
    return;
  }

  var scrollBox = document.getElementById('scrollBox');
  if (!scrollBox) {
    return;
  }

  scrollUpBottom.setAttribute('data-action', 'scroll');

  var disable = scrollBox.scrollTop < 1;
  if (disable) {
    var bookchapter = document.getElementById('bookchapter');
    if (bookchapter) {
      var dataHref = scrollUpBottom.getAttribute('data-href');
      if (dataHref) {
        disable = false;
        scrollUpBottom.setAttribute('data-action', 'openurl');
      }
    }
  }

  disableScrollBottom(scrollUpBottom, disable);
}

function updateScrollBottomStatus() {
  updateScrollDownBottomStatus();
  updateScrollUpBottomStatus();
}

function scrollToEnd() {
  var hashValue = window.location.hash;
  if (hashValue === '#end') {
    var scrollBox = document.getElementById('scrollBox');
    if (scrollBox) {
      scrollBox.scrollTop += scrollBox.scrollHeight;
    }
  }
}

function init() {
  curFontSize = initFontSize();
  initNavbarHeight();
  setFontSizeStyle(curFontSize);
  updateScrollBottomStatus();
  scrollToEnd();
}

function changeFontSize(delta) {
  setFontSize(curFontSize + delta);
  setFontSizeStyle(curFontSize);
}

function setFontSizeStyle(fontSize) {
  var container = document.getElementsByClassName('mainContent')[0];
  if (container) {
    var bookchapter = document.getElementById('bookchapter');

    var containerStyle = window.getComputedStyle(container);
    //alert('before change font size: height ' + container.scrollHeight + ' fontsize ' + containerStyle.fontSize + ' paddingTop ' + containerStyle.paddingTop);
    if (bookchapter) {
      container.style.fontSize = fontSize + 'em';
    }

    var fontSize = getPxValue(containerStyle.fontSize);
    var r1 = (container.clientHeight - navbarHeight) / fontSize; // 获取大概可以显示多少行，这个值大概率会带小数点
    var r2 = Math.floor(r1); // 获取整数的行数
    if (r1 - r2 < 0.2 && r2 > 1) { // 如果小数点部分太少，则多留一行给空白
      r2 -= 1;
    }
    step = r2 * fontSize; // 获取实际的翻页长度
    var paddingTop = container.clientHeight - step - navbarHeight; // 空白高度
    //alert('container.clientHeight: ' + container.clientHeight);
    //alert('containerStyle.fontSize: ' + containerStyle.fontSize);
    //alert('r1: ' + r1);
    //alert('r2: ' + r2);
    //alert('step: ' + step);
    //alert('navbarHeight: ' + navbarHeight);
    //alert('paddingTop: ' + paddingTop);
    container.style.paddingTop = paddingTop + 'px';
    //alert('height paddingTop:' + containerStyle.paddingTop + ' paddingBottom ' + containerStyle.paddingBottom + ' height ' + containerStyle.height);
    //alert('after change font size: height ' + container.scrollHeight + ' fontsize ' + containerStyle.fontSize + ' paddingTop ' + containerStyle.paddingTop);
  }
}

// pxText 示例 20px
function getPxValue(pxText) {
  var numText = pxText.slice(0, pxText.length - 2)
  return parseInt(numText);
}

function _scrollContent(scrollBottom) {
  var scrollBox = document.getElementById('scrollBox');
  if (scrollBox) {
    var action = scrollBottom.getAttribute('data-action');
    if (action === 'scroll') {
      var offfsetY = step * (scrollBottom.id === 'scrollDown' ? 1 : -1);
      scrollBox.scrollTop += offfsetY;
    } else {
      var href = scrollBottom.getAttribute('data-href');
      if (href) {
        if (scrollBottom.id === 'scrollUp') {
          href += '#end';
        }
        window.location = href;
      }
    }
  }
}

function scrollContent(ev) {
  ev.stopPropagation();
  _scrollContent(ev.target);
}

function attachEventListeners() {
  var container = document.getElementById('scrollBox');

  if (container) {
    var bookchapter = document.getElementById('bookchapter');
    if (bookchapter) {
      container.addEventListener('click', function (ev) {
        console.log('clientX:', ev.clientX, ' clientY:', ev.clientY);
        console.log(
          'isClickedRightSide:',
          isClickedRightSide(window.innerWidth, ev.clientX)
        );
        ev.stopPropagation();
        var scrollBottom = document.getElementById(isClickedRightSide(window.innerWidth, ev.clientX) ? 'scrollDown': 'scrollUp');
        if (scrollBottom) {
          _scrollContent(scrollBottom);
        }
      });
    }
    container.addEventListener('scroll', function (ev) {
      updateScrollBottomStatus();
    });
  }

  var anchors = document.getElementsByClassName('anchor');

  var index = 0;
  for (index = 0; index < anchors.length; index++) {
    var anchor = anchors[index];
    anchor.addEventListener('click', goTo);
  }

  var scrollDownBottom = document.getElementById('scrollDown')
  if (scrollDownBottom) {
    scrollDownBottom.onclick = scrollContent;
  }
  var scrollUpBottom = document.getElementById('scrollUp')
  if (scrollUpBottom) {
    scrollUpBottom.onclick = scrollContent;
  }
}

window.onload = function () {
  init();
  attachEventListeners();
};

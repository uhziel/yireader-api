function isClickedRightSide(width, x) {
  return x > width / 3;
}

function goTo(clickEvent) {
  var href = clickEvent.target.getAttribute('data-href');
  window.location = href;
}

var defaultUserData = {
  theme: {
    'font-size': 1
  },
  version: 3
};

var userData = null
var step = window.innerWidth; //一次翻页的长度
var navbarHeight = 30; // 单位: px

function initNavbarHeight() {
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var navbarStyle = window.getComputedStyle(navbar);
    navbarHeight = getPxValue(navbarStyle.height);
  }
}

function init() {
  var userDataStr = localStorage.getItem('inkUserData');
  if (userDataStr) {
    try {
      userData = JSON.parse(userDataStr);
    } catch(e) {
      localStorage.removeItem('inkUserData');
    }
  }

  if (!userData) {
    userData = defaultUserData;
  }
  initNavbarHeight();
  setFontSizeStyle(userData.theme['font-size']);
}

function changeFontSize(delta) {
  userData.theme['font-size'] += delta;
  if (userData.theme['font-size'] < 1) {
    userData.theme['font-size'] = 1;
  }
  setFontSizeStyle(userData.theme['font-size']);
  localStorage.setItem('inkUserData', JSON.stringify(userData));
}

function setFontSizeStyle(fontSize) {
  var container = document.getElementById('mainContent');
  if (container) {
    var containerStyle = window.getComputedStyle(container);
    //alert('before change font size: height ' + container.scrollHeight + ' fontsize ' + containerStyle.fontSize + ' paddingTop ' + containerStyle.paddingTop);
    container.style.fontSize = fontSize + 'em';
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

function attachEventListeners() {
  var container = document.getElementById('mainContent');

  if (container) {
    container.addEventListener('click', function (ev) {
      console.log('clientX:', ev.clientX, ' clientY:', ev.clientY);
      console.log(
        'isClickedRightSide:',
        isClickedRightSide(window.innerWidth, ev.clientX)
      );
      var offsetY = step *
        (isClickedRightSide(window.innerWidth, ev.clientX) ? 1 : -1);
      container.scrollTop += offsetY;
    });
  }

  var anchors = document.getElementsByClassName('anchor');

  var index = 0;
  for (index = 0; index < anchors.length; index++) {
    var anchor = anchors[index];
    anchor.addEventListener('click', goTo);
  }
}

window.onload = function () {
  init();
  attachEventListeners();
};

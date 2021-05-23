function isClickedRightSide(width, x) {
  return x > width / 3;
}

function goTo(clickEvent) {
  var href = clickEvent.target.getAttribute('data-href');
  window.location = href;
}

function initShams() {
  if (!window.localStorage) {
    var localStorage = {};
    localStorage.getItem = function() { return null; };
    localStorage.setItem = function() {};
    localStorage.removeItem = function() {};
    window.localStorage = localStorage;
  }
}

var defaultUserData = {
  bookshelf: {},
  theme: {
    "font-size": 1.83
  },
  version: 3
};

var userData = null
function init() {
  var userDataStr = localStorage.getItem("userData");
  if (userDataStr) {
    try {
      userData = JSON.parse(userDataStr);
    } catch(e) {
      localStorage.removeItem("userData");
    }
  }

  if (!userData) {
    userData = defaultUserData;
    setFontSizeStyle(userData.theme['font-size']);
  }
}

function changeFontSize(delta) {
  userData.theme['font-size'] += delta;
  if (userData.theme['font-size'] < 1.035) {
    userData.theme['font-size'] = 1.035;
  }
  setFontSizeStyle(userData.theme['font-size']);
  localStorage.setItem('userData', JSON.stringify(userData));
}

function setFontSizeStyle(fontSize) {
  var container = document.getElementById('chapterContent');
  if (container) {
    container.style = "font-size: " + fontSize + "em;";
  }
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
      var offsetY =
        window.innerHeight *
        (isClickedRightSide(window.innerWidth, ev.clientX) ? 0.8 : -0.8);
      console.log('window.scrollBy(0, %d);', offsetY);
      window.scrollBy(0, offsetY);
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
  initShams();
  init();
  attachEventListeners();
};

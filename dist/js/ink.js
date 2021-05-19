const container = document.getElementById('mainContent');

function isClickedRightSide(width, x) {
  return x > width / 3;
}

container.addEventListener('click', ev => {
  console.log('clientX:', ev.clientX, ' clientY:', ev.clientY);
  console.log(
    'isClickedRightSide:',
    isClickedRightSide(window.innerWidth, ev.clientX)
  );
  let offsetY =
    window.innerHeight *
    (isClickedRightSide(window.innerWidth, ev.clientX) ? 0.8 : -0.8);
  console.log('window.scrollBy(0, %d);', offsetY);
  window.scrollBy(0, offsetY);
});

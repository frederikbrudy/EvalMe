const {screen} = require('electron')

const screenInfoBtn = document.getElementById('screen-info')

screenInfoBtn.addEventListener('click', () => {
  const size = screen.getPrimaryDisplay().size

  const message = `Your screen is: ${size.width}px x ${size.height}px`
  document.getElementById('got-screen-info').innerHTML = message
})

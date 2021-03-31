$(function() {
  // Global variables
  let i;
  let timer;
  let $cubeList = $('#floating-cubes');
  const sides = [
    {name: 'front', animation: ''},
    {name: 'back', animation: 'rotateY(180deg) rotateX(0deg)'},
    {name: 'right', animation: 'rotateY(90deg)'},
    {name: 'left', animation: 'rotateY(-90deg)'},
    {name: 'top', animation: 'rotateX(90deg)'},
    {name: 'bottom', animation: 'rotateX(-90deg) rotateZ(-180deg)'},
  ];

  class Cube {
    constructor(cube) {
      this.position = cube.position;
      this.size = cube.size;
      this.duration = cube.duration;
    };

    addToDom() {
      let li = document.createElement('li');
      li.appendChild(generateCubeDiv(this.size / 2));

      // Add styling to the new li element
      Object.assign(li.style, {
        left: this.position + '%',
        height: this.size + 'px',
        width: this.size + 'px',
        webkitPerspective: this.size * 3 + 'px',
        perspective: this.size * 3 + 'px',
        webkitAnimation: 'square ' + this.duration + 's',
        animation: 'square ' + this.duration + 's'
      });

      // Remove cube after it's finished animating and has reached the top
      // unless you want to freeze your users browser after a minute
      $(li).one("animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd",
      function(event) {
        (this).remove();
      });

      $cubeList.append(li);
    };
  };

  // ACTUAL SCRIPT BEGINS
  
  startTimer();

  // ACTUAL SCRIPT ENDS (lol)

  // This timer stuff is necessary because otherwise
  // when a user changes tabs they will be greeted by
  // a million cubes when they return to this tab
  //NOTE: doesn't work well on codepen
  function startTimer() {
    newCube()
    timer = window.setInterval(function() {
      newCube();
    }, 8000);
    window.onblur = function() { stopTimer(); };
    window.onfocus = null;
  }

  function stopTimer() {
    clearInterval(timer);
    window.onblur = null;
    window.onfocus = function() { startTimer(); };
  }

  function newCube() {
    let cube = new Cube({
      position: random(0, 90),
      size: random(30, 80),
      duration: random(10, 12)
    });
    cube.addToDom();
  };

  function generateCubeDiv(translateSize) {
    let cubeDiv = document.createElement('div');
    cubeDiv.className = 'cube';

    // Add all 6 sides to cube div and add their respective styles/classes
    for (i = 0; i < sides.length; i++) {
      let sideDiv = document.createElement('div');
      sideDiv.className = sides[i].name;
      Object.assign(sideDiv.style, {
        webkitTransform: sides[i].animation + ' translateZ(' + translateSize + 'px)',
        transform: sides[i].animation + ' translateZ(' + translateSize + 'px)'
      });
      cubeDiv.appendChild(sideDiv);
    };

    return cubeDiv;
  };

  function random(min, max) {
    return Math.floor((Math.random() * max) + min);
  };
});
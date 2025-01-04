import * as THREE from 'three';

import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";


// random image generation
function changeImage() {
  const image = document.querySelector("img");

  const rand4 = Math.floor(Math.random() * 3) + 1;
  image.src = 'images/' + rand4 + '.jpg';

}

changeImage();



function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}



export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.img = this.container.querySelector('img')
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1);
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    const frustumSize = 1;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(frustumSize / -2, frustumSize / 2, frustumSize / 2, frustumSize / -2, -1000, 1000);
    this.camera.position.set(0, 0, 2);

    this.time = 0;

    this.mouse = {
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      vX: 0,
      vY: 0
    }

    this.isPlaying = true;
    this.settings();
    this.addObjects();
    this.resize();
    this.render();
    this.setupResize();

    this.mouseEvents()

  }

  // getValue(val){
  // console.log(val)
  // return parseFloat(this.container.getAttribute('data-'+val))
  // }

  mouseEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX / this.width;
      this.mouse.y = e.clientY / this.height;

      // console.log(this.mouse.x,this.mouse.y)

      this.mouse.vX = this.mouse.x - this.mouse.prevX;
      this.mouse.vY = this.mouse.y - this.mouse.prevY;


      this.mouse.prevX = this.mouse.x
      this.mouse.prevY = this.mouse.y;

      // console.log(this.mouse.vX,'vx')
    })
  }


  settings() {
    let that = this;
    this.settings = {
      grid: Math.floor((Math.random() * (100 - 1000) + 1000)),
      mouse: (Math.random() * (.5 - .85) + .85) || 0.5,
      strength: (Math.random() * (.5 - .75) + .75) || 1,
      relaxation: Math.random() * (.99 - .85) + .85 || .99,
    };

    console.log(this.settings);
    // console.log(that);

  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;


    // image cover
    this.imageAspect = 1. / 1.5;
    let a1;
    let a2;
    if (this.height / this.width > this.imageAspect) {
      a1 = (this.width / this.height) * this.imageAspect;
      a2 = 1;
    } else {
      a1 = 1;
      a2 = (this.height / this.width) / this.imageAspect;
    }

    this.material.uniforms.resolution.value.x = this.width;
    this.material.uniforms.resolution.value.y = this.height;
    this.material.uniforms.resolution.value.z = a1;
    this.material.uniforms.resolution.value.w = a2;

    this.camera.updateProjectionMatrix();
    this.regenerateGrid()


  }

  regenerateGrid() {
    this.size = this.settings.grid;

    const width = this.size;
    const height = this.size;

    const size = width * height;
    const data = new Float32Array(3 * size);
    const color = new THREE.Color(0xffffff);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    for (let i = 0; i < size; i++) {
      let r = Math.random() * 255 - 125;
      let r1 = Math.random() * 255 - 125;

      const stride = i * 3;

      data[stride] = r;
      data[stride + 1] = r1;
      data[stride + 2] = r;

    }

    // used the buffer to create a DataTexture

    this.texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);

    this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;

    if (this.material) {
      this.material.uniforms.uDataTexture.value = this.texture;
      this.material.uniforms.uDataTexture.value.needsUpdate = true;
    }
  }

  addObjects() {

    this.regenerateGrid()

    let texture = new THREE.Texture(this.img)
 
    texture.needsUpdate = true;
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: {
          value: 0
        },
        resolution: {
          value: new THREE.Vector4()
        },
        uTexture: {
          value: texture
        },
        uDataTexture: {
          value: this.texture
        },
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);
  }


  updateDataTexture() {
    let data = this.texture.image.data;
    for (let i = 0; i < data.length; i += 3) {
      data[i] *= this.settings.relaxation
      data[i + 1] *= this.settings.relaxation
    }

    let gridMouseX = this.size * this.mouse.x;
    let gridMouseY = this.size * (1 - this.mouse.y);
    let maxDist = this.size * this.settings.mouse;
    let aspect = this.height / this.width

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {

        let distance = ((gridMouseX - i) ** 2) / aspect + (gridMouseY - j) ** 2
        let maxDistSq = maxDist ** 2;

        if (distance < maxDistSq) {

          let index = 3 * (i + this.size * j);

          let power = maxDist / Math.sqrt(distance);
          power = clamp(power, 0, 10)
          // if(distance <this.size/32) power = 1;
          // power = 1;

          data[index] += this.settings.strength * 100 * this.mouse.vX * power;
          data[index + 1] -= this.settings.strength * 100 * this.mouse.vY * power;

        }
      }
    }

    this.mouse.vX *= 0.9;
    this.mouse.vY *= 0.9;
    this.texture.needsUpdate = true
  }


  render() {
    if (!this.isPlaying) return;
    this.time += 0.05;
    this.updateDataTexture()
    this.material.uniforms.time.value = this.time;
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("load", () => {
  new Sketch({
    dom: document.getElementById("canvas-container")
  });
  
})

// cards 
const allCards = document.querySelectorAll('.card');

allCards.forEach(card => {
  card.addEventListener('click', () => {
    card.classList.toggle('is-flipped');
    card.classList.toggle('call');

    if (allCards.length > 1) {
      allCards.forEach(c => {
        if (c !== card && c.classList.contains('is-flipped')) {
          c.classList.remove('is-flipped');
          c.classList.remove('call');

        } else {
          card.classList.add('is-flipped');
        }
      })
    }

    if (card.classList.contains('is-flipped')) {
      card.classList.add('call');
      window.scrollTo({
        top: document.querySelector('.call').offsetTop - 40,
        behavior: 'smooth'
      })
    }

  })
})

// player on repeat no more
document.addEventListener('play', function (e) {
  const audioPlayers = document.getElementsByTagName('audio');
  for (let i = 0, len = audioPlayers.length; i < len; i++) {
    if (audioPlayers[i] != e.target) {
      audioPlayers[i].pause();
    }
  }
}, true);

// Attach a click event to each nav link to scroll
document.querySelectorAll(".frame-title-wrap nav a").forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});

const textElement = document.querySelector('.email');
const notification = document.querySelector('.copy-text');

textElement.addEventListener('click', () => {
  // Copy text to clipboard
  const textToCopy = textElement.textContent;
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      // Show notification
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
      }, 2000); // Hide notification after 2 seconds
    })
    .catch(err => console.error('Failed to copy text: ', err));
});

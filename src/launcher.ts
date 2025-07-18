import { loadGame, initRetroFs, localData, loadStroe } from './fs';

// function loadScript (source, beforeEl, async = true, defer = true) {
//   return new Promise((resolve, reject) => {
//     let script = document.createElement('script');
//     const prior = beforeEl || document.getElementsByTagName('script')[0];
//     script.async = async;
//     script.defer = defer;
//     function onloadHander() {
//       resolve(null)
//     }
//     script.onload = onloadHander;
//     script.src = source;
//     prior.parentNode.insertBefore(script, prior);
//   })
// }
export function loadScript(source: string, callback: Function, async = true, defer = true) {
  const script = document.createElement('script');
  const prior = document.getElementsByTagName('script')[0];
  // script.type = "module"
  script.async = async
  script.defer = defer
  script.onload = function () {
    setTimeout(callback, 0);
  };
  script.src = source;
  prior.parentNode.insertBefore(script, prior)
}

window.message_queue = [];
export function initModule () {
  window.Module = {
    noInitialRun: true,
    arguments: ["/home/web_user/retroarch/userdata/content/downloads/"],
    preRun: [
      function() {
         function stdin() {
        // Return ASCII code of character, or null if no input
        while(window.message_queue.length > 0){
          var msg = window.message_queue[0][0];
          var index = window.message_queue[0][1];
          if(index >= msg.length) {
            window.message_queue.shift();
          } else {
            window.message_queue[0][1] = index+1;
            // assumption: msg is a uint8array
            return msg[index];
          }
        }
        return null;
      }
      window.FS.init(stdin);
    }
    ],
    postRun: [function() {
      console.log('pppsssssssssst rrrrrrrrrrrrrun')
    }],
   encoder: new TextEncoder(),
   message_queue: [],
   message_out: [],
   message_accum: "",
   retroArchSend: function(msg) {
      let bytes = this.encoder.encode(msg+"\n");
      this.message_queue.push([bytes,0]);
   },
   retroArchRecv: function() {
      let out = this.message_out.shift();
      if(out == null && this.message_accum != "") {
         out = this.message_accum;
         this.message_accum = "";
      }
      return out;
   },
    onRuntimeInitialized: function() {
    }, 
    print: function(text)
    {
      console.log(text);
    },
    printErr: function(text)
    {
      console.log(text);
    },
    canvas: document.getElementById('canvas'),
    totalDependencies: 0,
    monitorRunDependencies: function(left)
    {
      this.totalDependencies = Math.max(this.totalDependencies, left);
    }
  }
//   var Module = {
//    noInitialRun: true,
//    arguments: ["-v", "--menu"],

//    encoder: new TextEncoder(),
//    message_queue:[],
//    message_out:[],
//    message_accum:"",

//    retroArchSend: function(msg) {
//       let bytes = this.encoder.encode(msg+"\n");
//       this.message_queue.push([bytes,0]);
//    },
//    retroArchRecv: function() {
//       let out = this.message_out.shift();
//       if(out == null && this.message_accum != "") {
//          out = this.message_accum;
//          this.message_accum = "";
//       }
//       return out;
//    },
//    preRun: [
//       function(module) {
//          function stdin() {
//             // Return ASCII code of character, or null if no input
//             while(module.message_queue.length > 0){
//                var msg = module.message_queue[0][0];
//                var index = module.message_queue[0][1];
//                if(index >= msg.length) {
//                   module.message_queue.shift();
//                } else {
//                   module.message_queue[0][1] = index+1;
//                   // assumption: msg is a uint8array
//                   return msg[index];
//                }
//             }
//             return null;
//          }
//          function stdout(c) {
//             if(c == null) {
//                // flush
//                if(module.message_accum != "") {
//                   module.message_out.push(module.message_accum);
//                   module.message_accum = "";
//                }
//             } else {
//                let s = String.fromCharCode(c);
//                if(s == "\n") {
//                   if(module.message_accum != "") {
//                      module.message_out.push(module.message_accum);
//                      module.message_accum = "";
//                   }
//                } else {
//                   module.message_accum = module.message_accum+s;
//                }
//             }
//          }
//          module.FS.init(stdin, stdout);
//       }
//    ],
//    postRun: [],
//    onRuntimeInitialized: function()
//       {
//          appInitialized();
//       },
//    print: function(text)
//       {
//          console.log(text);
//       },
//    printErr: function(text)
//       {
//          console.error(text);
//       },
//     canvas: document.getElementById("canvas"),
//    totalDependencies: 0,
//    monitorRunDependencies: function(left)
//       {
//          this.totalDependencies = Math.max(this.totalDependencies, left);
//       }
// };
//   var Module = {
//    noInitialRun: true,
//    arguments: ["-v", "--menu", "-c", "/home/web_user/retroarch/userdata/retroarch.cfg"],

//    encoder: new TextEncoder(),
//    message_queue: [],
//    message_out: [],
//    message_accum: "",

//    retroArchSend: function(msg) {
//       this.EmscriptenSendCommand(msg);
//    },
//    retroArchRecv: function() {
//       return this.EmscriptenReceiveCommandReply();
//    },
//    onRuntimeInitialized: function() {
//       appInitialized();
//    },
//    print: function(text) {
//       console.log("stdout:", text);
//    },
//    printErr: function(text) {
//       console.log("stderr:", text);
//    },
//    canvas: document.getElementById("canvas"),
//    totalDependencies: 0,
//    monitorRunDependencies: function(left) {
//       this.totalDependencies = Math.max(this.totalDependencies, left);
//    }
// };
}

// const coreModules = import.meta.glob('/public/cores/*_libretro.js')
let loaded = false
function run () {
  loadStroe()
  const { game, platform, core } = localData.save.selectedGame
  if (!game || !platform || !core)  return
  initModule()
  window.Module.arguments = navigator.userAgent.indexOf('Chrome') > 0 ?  ['-v', `/home/web_user/retroarch/userdata/content/downloads/${game}`] : ["-v", "--menu"]
  // window.Module.arguments = [`/home/web_user/retroarch/userdata/content/downloads/${game}`]
  window.Module.onRuntimeInitialized = () => {
    document.getElementById('play').textContent = 'Loading game ...'
    loadGame(platform, game, (memFs) => {
      document.getElementById('play').textContent = 'Loading retroarch files ...'
      initRetroFs(memFs, () => {
        document.getElementById('play').style.display = 'none'
        // document.getElementById('play').textContent = 'Play (A)'
        loaded = true
        window['playGame']()
      })
    })
  }
  loadScript(`cores/${core}_libretro.js`, () => {
    console.log('core loaded')
  })
  // if (!coreModules[`/public/cores/${core}_libretro.js`]) {
  //   console.error(`Core ${core} not found`)
  //   return
  // }
  // coreModules[`/public/cores/${core}_libretro.js`]()
  // .then((script: any) => {script.default(window.Module)})
  // .then(mod => {
  //   }).catch(err => {
  //       console.error("Couldn't instantiate module", err);
  //       throw err;
  //   })
  // }).catch(err => {
  //   console.error("Couldn't load script", err);
  //   throw err;
  // });
}

const keys = {
  9: "tab",
  13: "enter",
  16: "shift",
  18: "alt",
  27: "Escape",
  33: "rePag",
  34: "avPag",
  35: "end",
  36: "home",
  37: "left",
  38: "up",
  39: "right",
  40: "down",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12"
};
window.addEventListener('keydown', function (e) {
  if (Object.values(keys).includes(e.key)) {
    e.preventDefault();
  }
});

let gpInterval;
if(location.search) {
  window.addEventListener("gamepadconnected", function(e) {
    console.log("launcher: controller connected")
    if (!gpInterval) {
      gpInterval = setInterval(pollGamepads, 100)
    }
  })
  run()
}

const launcherEl = document.getElementById('launcher')
window['toggleFullScreen'] = () => {
  const elemBar = document.getElementById('bar');
  const dispStyle = getComputedStyle(elemBar)['display'];
  if (document.fullscreenElement) {
    document.exitFullscreen()
    if (dispStyle === 'none') {
      document.getElementById('bar').style.display = 'block';
    }
  } else {
    launcherEl.requestFullscreen()
    if (dispStyle !== 'none') {
      document.getElementById('bar').style.display = 'none';
    }
  }
}
window['exitToApp'] = () => {
  keyPress('Escape')
  setTimeout(() => {
    keyPress('Escape')
    setTimeout(parent.window.exitGame, 600)
    clearInterval(gpInterval)
  }, 100)
  // if (document.fullscreenElement) {
  //   document.exitFullscreen()
  // }
  window.onbeforeunload = null
}

window['playGame'] = function() {
  if (!loaded) return
  window.onbeforeunload = function() {
    return "Dude, are you sure you want to leave?";
  }
  window.Module['callMain'](window.Module['arguments']);
  window.Module['resumeMainLoop']();
  document.getElementById('canvas').focus()
  setTimeout(() => {
    window.Module.canvas.style.width = 'auto';
    window.Module.canvas.style.height = '85%';
    document.getElementById('bar').style.display = 'block';
  }, 500);
  document.getElementById('play').style.display = 'none'
}

function hideBar() {
  const elemBar = document.getElementById('bar');
  const dispStyle = getComputedStyle(elemBar)['display'];
  if (dispStyle === 'none') {
    document.getElementById('bar').style.display = 'block';
  } else {
    document.getElementById('bar').style.display = 'none';
  }
}

function keyPress(code: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', {code }))
  setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code }))
    console.log('key press', code)
  }, 33)
}
window['keyPress'] = keyPress

const HotKeys: [number, number, number, string|Function][] = [
  [6, 9, 0, 'F1'],
  [4, 9, 0, hideBar],
  [6, 8, 0, window['toggleFullScreen']],
  [4, 8, 0, window['exitToApp']],
  [7, 8, 0, 'F2'],
  [7, 9, 0, 'F4'],
]

function pollGamepads() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
  for (let i = 0; i < 1; i++) {
    const gp = gamepads[i];
    if (gp) {
      const pressed: number[] = []
      for (let j = 0; j < gp.buttons.length; j++) {
        if (gp.buttons[j].pressed) {
          pressed.push(j)
        }
      }
      if (pressed.length) {
        HotKeys.forEach((x) => {
          const [k1, k2, ts, KeyOrFn] = x
          if ((ts + 600) < gp.timestamp && pressed.includes(k1) && pressed.includes(k2)) {
            x[2] = gp.timestamp
            if (typeof KeyOrFn === 'string') {
              keyPress(KeyOrFn)
            } else {
              KeyOrFn()
            }
          }
        })
      }
    }
  }
  // const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = (window.performance as any).memory
  // document.getElementById('info').innerText = `${(totalJSHeapSize/jsHeapSizeLimit).toFixed(4)} , ${(usedJSHeapSize/totalJSHeapSize).toFixed(4)}`
}


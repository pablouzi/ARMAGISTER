/* A-Frame 1.8.0 — primer toque coloca; siguientes toques sobre malla: Action -> Idle. */
(() => {
  'use strict';
  const setStatus = (message) => {
    const element = document.querySelector('#status');
    if (element) element.textContent = message;
  };

  AFRAME.registerComponent('character-animations', {
    schema: {
      idle: { type: 'string', default: 'idle' },
      action: { type: 'string', default: 'Action' },
      fade: { type: 'number', default: 0.2 }
    },
    init() {
      this.mixer = null;
      this.idleAction = null;
      this.specialAction = null;
      this.busy = false;
      this.ready = false;
      this.onFinished = (event) => {
        if (event.action !== this.specialAction) return;
        this.busy = false;
        // crossFade: deja de reproducir Action y vuelve a Idle.
        this.idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        this.idleAction.crossFadeFrom(this.specialAction, this.data.fade, true);
        setStatus('Toca el personaje para repetir la acción');
      };
      this.onModelLoaded = (event) => {
        const model = event.detail.model;
        const clips = model.animations || [];
        const names = clips.map(c => c.name);
        console.info('[WebAR] Animaciones disponibles:', names);
        const idleClip = THREE.AnimationClip.findByName(clips, this.data.idle);
        const actionClip = THREE.AnimationClip.findByName(clips, this.data.action);
        if (!idleClip || !actionClip) {
          console.error('[WebAR] Faltan clips. Disponibles:', names);
          setStatus('Revisa los nombres Idle y Action. Abre la consola.');
          return;
        }
        this.mixer = new THREE.AnimationMixer(model);
        this.idleAction = this.mixer.clipAction(idleClip).setLoop(THREE.LoopRepeat, Infinity);
        this.specialAction = this.mixer.clipAction(actionClip).setLoop(THREE.LoopOnce, 1);
        this.specialAction.clampWhenFinished = false;
        this.mixer.addEventListener('finished', this.onFinished);
        this.idleAction.play();
        this.ready = true;
        setStatus('Modelo listo. Pulsa AR para comenzar.');
      };
      this.el.addEventListener('model-loaded', this.onModelLoaded);
      this.el.addEventListener('model-error', () => {
        setStatus('No se pudo cargar assets/personaje.glb');
      });
    },
    playSpecial() {
      if (!this.ready || this.busy) return;
      this.busy = true;
      this.specialAction.reset().setLoop(THREE.LoopOnce, 1).play();
      this.specialAction.crossFadeFrom(this.idleAction, this.data.fade, true);
      setStatus('Reproduciendo acción…');
    },
    tick(time, delta) {
      if (this.mixer && delta) this.mixer.update(Math.min(delta / 1000, 0.1));
    },
    remove() {
      if (this.mixer) this.mixer.removeEventListener('finished', this.onFinished);
      this.el.removeEventListener('model-loaded', this.onModelLoaded);
    }
  });

  AFRAME.registerComponent('xr-character-app', {
    init() {
      this.anchor = document.querySelector('#ancla');
      this.character = document.querySelector('#personaje');
      this.placed = false;
      this.placedAt = 0;
      this.raycaster = new THREE.Raycaster();
      this.rayOrigin = new THREE.Vector3();
      this.rayDirection = new THREE.Vector3();
      this.rayQuaternion = new THREE.Quaternion();
      this.modelMeshes = [];

      this.character.addEventListener('model-loaded', () => {
        this.modelMeshes = [];
        this.character.getObject3D('mesh').traverse(obj => {
          if (obj.isMesh || obj.isSkinnedMesh) this.modelMeshes.push(obj);
        });
      });

      this.onPlacement = () => {
        if (this.placed) return;
        this.placed = true;
        this.placedAt = performance.now();
        this.el.setAttribute('ar-hit-test', 'enabled', false);
        this.anchor.object3D.visible = true;
        setStatus('Personaje colocado. Tócalo para activar Action.');
        console.info('[WebAR] Personaje colocado.');
      };
      this.el.addEventListener('ar-hit-test-select', this.onPlacement);

      this.onXRSelect = (event) => {
        if (!this.placed || performance.now() - this.placedAt < 450) return;
        if (!event.frame || !event.inputSource) return;
        const refSpace = this.el.renderer.xr.getReferenceSpace();
        if (!refSpace) return;
        const pose = event.frame.getPose(event.inputSource.targetRaySpace, refSpace);
        if (!pose) return;
        const p = pose.transform.position;
        const q = pose.transform.orientation;
        this.rayOrigin.set(p.x, p.y, p.z);
        this.rayQuaternion.set(q.x, q.y, q.z, q.w);
        this.rayDirection.set(0, 0, -1).applyQuaternion(this.rayQuaternion).normalize();
        this.hitCharacter();
      };
      this.onEnterAR = () => {
        this.placed = false;
        this.anchor.object3D.visible = false;
        this.el.setAttribute('ar-hit-test', 'enabled', true);
        setStatus('Apunta hacia el suelo y toca para colocar el personaje.');
        this.xrSession = this.el.renderer.xr.getSession();
        if (this.xrSession) this.xrSession.addEventListener('select', this.onXRSelect);
      };
      this.onExitAR = () => {
        if (this.xrSession) this.xrSession.removeEventListener('select', this.onXRSelect);
        this.xrSession = null;
        this.placed = false;
        this.anchor.object3D.visible = true;
        this.anchor.setAttribute('position', '0 1.3 -2');
        this.anchor.setAttribute('rotation', '0 0 0');
        this.el.setAttribute('ar-hit-test', 'enabled', true);
        setStatus('Vista previa. Pulsa AR para colocar en el suelo.');
      };
      this.onDesktopClick = (event) => {
        if (this.el.is('ar-mode')) return;
        // Vista previa sin AR: click sobre la malla para probar animaciones.
        const rect = this.el.canvas.getBoundingClientRect();
        const normalized = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const camera = this.el.camera;
        if (!camera) return;
        this.raycaster.setFromCamera(normalized, camera);
        if (this.modelMeshes.length && this.raycaster.intersectObjects(this.modelMeshes, false).length) {
          this.character.components['character-animations']?.playSpecial();
        }
      };
      this.hitCharacter = () => {
        if (!this.modelMeshes.length) return;
        this.character.object3D.updateWorldMatrix(true, true);
        this.raycaster.set(this.rayOrigin, this.rayDirection);
        if (this.raycaster.intersectObjects(this.modelMeshes, false).length) {
          this.character.components['character-animations']?.playSpecial();
        }
      };
      this.el.addEventListener('enter-ar', this.onEnterAR);
      this.el.addEventListener('exit-ar', this.onExitAR);
      this.el.addEventListener('renderstart', () => {
        if (this.el.canvas) this.el.canvas.addEventListener('click', this.onDesktopClick);
      }, { once: true });
    },
    remove() {
      this.el.removeEventListener('ar-hit-test-select', this.onPlacement);
      this.el.removeEventListener('enter-ar', this.onEnterAR);
      this.el.removeEventListener('exit-ar', this.onExitAR);
      if (this.xrSession) this.xrSession.removeEventListener('select', this.onXRSelect);
      if (this.el.canvas) this.el.canvas.removeEventListener('click', this.onDesktopClick);
    }
  });
})();

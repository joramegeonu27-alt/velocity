const particleCanvas = document.getElementById("heroParticles");
const particleContext = particleCanvas.getContext("2d");

const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let particleWidth;
let particleHeight;
let pixelRatio;
let embers = [];


/* =========================================
   CANVAS SETUP
   ========================================= */

function resizeParticleCanvas() {

    pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    particleWidth = window.innerWidth;

    particleHeight =
        document.querySelector(".hero").offsetHeight;


    particleCanvas.width =
        particleWidth * pixelRatio;

    particleCanvas.height =
        particleHeight * pixelRatio;


    particleCanvas.style.width =
        particleWidth + "px";

    particleCanvas.style.height =
        particleHeight + "px";


    particleContext.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );
}


resizeParticleCanvas();


window.addEventListener(
    "resize",
    resizeParticleCanvas
);


/* =========================================
   CINEMATIC EMBER PARTICLE
   ========================================= */

class CinematicEmber {

    constructor(initial = false) {

        this.reset(initial);

    }


    reset(initial = false) {

        /*
         * Particles originate from
         * the lower-right side.
         */

        this.x =
            particleWidth *
            (0.70 + Math.random() * 0.34);


        this.y =
            particleHeight *
            (0.78 + Math.random() * 0.25);


        if (initial) {

            this.y +=
                Math.random() *
                particleHeight *
                0.25;

        }


        /*
         * Movement:
         * upward + toward the left
         */

        this.velocityX =
            -(0.15 + Math.random() * 0.75);

        this.velocityY =
            -(0.35 + Math.random() * 1.15);


        /*
         * Atmospheric turbulence
         */

        this.wave =
            Math.random() *
            Math.PI *
            2;

        this.waveSpeed =
            0.015 +
            Math.random() * 0.035;

        this.waveStrength =
            0.15 +
            Math.random() * 0.35;


        /*
         * Particle size
         */

        this.size =
            Math.random() < 0.82
                ? 0.4 + Math.random() * 1.5
                : 1.5 + Math.random() * 2.5;


        /*
         * Particle opacity
         */

        this.opacity =
            0.20 +
            Math.random() * 0.65;


        /*
         * Most particles are ash.
         * Some particles are glowing embers.
         */

        this.isHot =
            Math.random() < 0.14;


        /*
         * Lifetime
         */

        this.life = 0;

        this.maxLife =
            120 +
            Math.random() * 190;


        /*
         * Rotation
         */

        this.rotation =
            Math.random() *
            Math.PI *
            2;

        this.rotationSpeed =
            (Math.random() - 0.5) *
            0.04;

    }


    /* =====================================
       UPDATE PARTICLE
       ===================================== */

    update() {

        this.life++;


        this.wave +=
            this.waveSpeed;


        /*
         * Wind / turbulence
         */

        const turbulence =
            Math.sin(this.wave) *
            this.waveStrength;


        this.x +=
            this.velocityX +
            turbulence;


        this.y +=
            this.velocityY;


        /*
         * Slight upward acceleration
         */

        this.velocityY -= 0.002;


        /*
         * Rotation
         */

        this.rotation +=
            this.rotationSpeed;


        /*
         * Slowly shrink
         */

        this.size *= 0.998;


        /*
         * Recycle particle
         */

        if (
            this.life > this.maxLife ||
            this.x < -80 ||
            this.y < -80 ||
            this.size < 0.12
        ) {

            this.reset();

        }

    }


    /* =====================================
       DRAW PARTICLE
       ===================================== */

    draw() {

        const progress =
            this.life /
            this.maxLife;


        let alpha =
            this.opacity;


        /*
         * Fade in
         */

        if (progress < 0.12) {

            alpha *=
                progress / 0.12;

        }


        /*
         * Fade out
         */

        if (progress > 0.62) {

            alpha *=
                1 -
                (
                    (progress - 0.62) /
                    0.38
                );

        }


        particleContext.save();


        particleContext.translate(
            this.x,
            this.y
        );


        particleContext.rotate(
            this.rotation
        );


        /* =================================
           HOT EMBER — tuned to match the
           site's brass/copper accent (#D9793F)
           ================================= */

        if (this.isHot) {

            particleContext.shadowBlur =
                10;

            particleContext.shadowColor =
                `rgba(217, 121, 63, ${alpha})`;


            const glow =
                particleContext.createRadialGradient(
                    0,
                    0,
                    0,
                    0,
                    0,
                    this.size * 5
                );


            glow.addColorStop(
                0,
                `rgba(240, 200, 160, ${alpha})`
            );


            glow.addColorStop(
                0.25,
                `rgba(240, 149, 92, ${alpha * 0.9})`
            );


            glow.addColorStop(
                0.6,
                `rgba(217, 121, 63, ${alpha * 0.3})`
            );


            glow.addColorStop(
                1,
                "rgba(217, 121, 63, 0)"
            );


            particleContext.fillStyle =
                glow;


            particleContext.beginPath();


            particleContext.arc(
                0,
                0,
                this.size * 5,
                0,
                Math.PI * 2
            );


            particleContext.fill();

        }


        /* =================================
           ASH PARTICLE
           ================================= */

        else {

            particleContext.shadowBlur = 0;


            particleContext.fillStyle =
                `rgba(190, 185, 175, ${alpha * 0.6})`;


            particleContext.beginPath();


            particleContext.moveTo(
                -this.size,
                0
            );


            particleContext.lineTo(
                0,
                -this.size * 0.7
            );


            particleContext.lineTo(
                this.size * 1.2,
                0
            );


            particleContext.lineTo(
                0,
                this.size * 0.8
            );


            particleContext.closePath();


            particleContext.fill();

        }


        particleContext.restore();

    }

}


/* =========================================
   CREATE PARTICLES
   ========================================= */

function createEmbers() {

    embers = [];


    /*
     * Responsive particle count
     */

    const particleCount =
        window.innerWidth < 768
            ? 85
            : 190;


    for (
        let i = 0;
        i < particleCount;
        i++
    ) {

        embers.push(
            new CinematicEmber(true)
        );

    }

}


/* =========================================
   ANIMATION LOOP
   ========================================= */

function animateCinematicParticles() {

    particleContext.clearRect(
        0,
        0,
        particleWidth,
        particleHeight
    );


    for (const ember of embers) {

        ember.update();

        ember.draw();

    }


    requestAnimationFrame(
        animateCinematicParticles
    );

}


/*
 * Respect reduced-motion preference: draw a single
 * still frame of embers instead of a running animation.
 */

createEmbers();

if (prefersReducedMotion) {

    particleContext.clearRect(0, 0, particleWidth, particleHeight);

    for (const ember of embers) {
        ember.draw();
    }

} else {

    animateCinematicParticles();

}


/* =========================================
   REBUILD PARTICLES AFTER RESIZE
   ========================================= */

window.addEventListener(
    "resize",
    () => {

        setTimeout(
            () => {
                createEmbers();

                if (prefersReducedMotion) {
                    particleContext.clearRect(0, 0, particleWidth, particleHeight);
                    for (const ember of embers) {
                        ember.draw();
                    }
                }
            },
            100
        );

    }
);
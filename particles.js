const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-2';
canvas.style.pointerEvents = 'none';

let width, height;
let particles = [];
let mouse = { x: null, y: null };

// Configuration
const particleCount = 120;
const interactionDist = 400;
const speed = 1.5; // Base speed

// Flocking configuration
const perceptionRadius = 75;
const separationForce = 0.3;
const alignmentForce = 0.05;
const cohesionForce = 0.01;
const maxSpeed = 2.5; // Max speed

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.size = Math.random() * 3 + 2;
        const colors = ['rgba(244, 208, 63, 0.6)', 'rgba(208, 225, 212, 0.4)', 'rgba(100, 255, 218, 0.3)'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    flock(particles) {
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let total = 0;

        for (let other of particles) {
            if (other !== this) {
                let d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
                if (d < perceptionRadius) {
                    alignment.x += other.vx;
                    alignment.y += other.vy;
                    cohesion.x += other.x;
                    cohesion.y += other.y;
                    separation.x += (this.x - other.x) / (d * d || 1);
                    separation.y += (this.y - other.y) / (d * d || 1);
                    total++;
                }
            }
        }

        if (total > 0) {
            // Alignment
            alignment.x /= total;
            alignment.y /= total;
            this.vx += (alignment.x - this.vx) * alignmentForce;
            this.vy += (alignment.y - this.vy) * alignmentForce;

            // Cohesion
            cohesion.x /= total;
            cohesion.y /= total;
            this.vx += (cohesion.x - this.x) * cohesionForce;
            this.vy += (cohesion.y - this.y) * cohesionForce;
            
            // Separation
            this.vx += separation.x * separationForce;
            this.vy += separation.y * separationForce;
        }
    }

    update(particles) {
        this.flock(particles);

        // Broad Attraction (Magnetic Pull)
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < interactionDist) {
                const force = Math.pow((interactionDist - distance) / interactionDist, 2);
                this.vx += (dx / distance) * force * 1.2 * 0.1;
                this.vy += (dy / distance) * force * 1.2 * 0.1;
            }
        }
        
        // Limit speed
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > maxSpeed) {
            this.vx = (this.vx / currentSpeed) * maxSpeed;
            this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x > width) this.x = 0;
        if (this.x < 0) this.x = width;
        if (this.y > height) this.y = 0;
        if (this.y < 0) this.y = height;
    }

    draw() {
        const angle = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(this.size * 1.5, 0);
        ctx.lineTo(-this.size, -this.size * 0.8);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size, this.size * 0.8);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update(particles);
        particles[i].draw();
    }
    requestAnimationFrame(animate);
}

initParticles();
animate();

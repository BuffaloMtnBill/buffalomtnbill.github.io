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
const particleCount = 120; // Slightly more fish
const interactionDist = 400; // Broad interaction radius
const speed = 1.0;

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
        this.size = Math.random() * 3 + 2; // Slightly larger for fish shape
        // Colors from palette
        const colors = ['rgba(244, 208, 63, 0.6)', 'rgba(208, 225, 212, 0.4)', 'rgba(100, 255, 218, 0.3)'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Broad Attraction (Magntic Pull)
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < interactionDist) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                // Smoother force falloff (quadratic)
                const force = Math.pow((interactionDist - distance) / interactionDist, 2);

                // Gentle pull
                const directionX = forceDirectionX * force * 1.2;
                const directionY = forceDirectionY * force * 1.2;

                this.vx += directionX * 0.05; // Influence velocity for smoother turns
                this.vy += directionY * 0.05;

                // Dampen velocity to prevent infinite acceleration
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > speed * 2) {
                    this.vx = (this.vx / currentSpeed) * speed * 2;
                    this.vy = (this.vy / currentSpeed) * speed * 2;
                }
            }
        }
    }

    draw() {
        // Calculate angle of movement
        const angle = Math.atan2(this.vy, this.vx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Draw Fish (Triangle)
        ctx.beginPath();
        ctx.moveTo(this.size * 1.5, 0); // Nose
        ctx.lineTo(-this.size, -this.size * 0.8); // Top tail
        ctx.lineTo(-this.size * 0.5, 0); // Tail indent
        ctx.lineTo(-this.size, this.size * 0.8); // Bottom tail
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
        particles[i].update();
        particles[i].draw();
        // Removed line connections
    }
    requestAnimationFrame(animate);
}

initParticles();
animate();

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
const DENSITY = 0.00025; // Target density: particles per pixel
const interactionDist = 600;
const speed = 0.5; // Base speed

// Flocking configuration
const breakawayAttractionMultiplier = 5.0; // How much more attractive a breakaway fish is
const driftChance = 0.5; // Chance for a normal fish to randomly drift
const driftAngle = Math.PI / 12; // 10 degrees - max angle for the drift
const perceptionRadius = 40;
const separationForce = 0.75;
const alignmentForce = 0.1;
const cohesionForce = 0.02;
const maxSpeed = 2.5; // Max speed
const breakawayChance = 0.000001; // Chance to break away

function updateParticles() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    const newParticleCount = Math.floor(width * height * DENSITY);
    const currentCount = particles.length;

    if (newParticleCount > currentCount) {
        // Add new particles
        for (let i = 0; i < newParticleCount - currentCount; i++) {
            particles.push(new Particle());
        }
    } else if (newParticleCount < currentCount) {
        // Remove particles
        particles.length = newParticleCount;
    }
}

window.addEventListener('resize', updateParticles);

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
        this.isBreakingAway = false;
        this.breakawayTimer = 0;
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
                    if (other.isBreakingAway) {
                        // This 'other' particle is a breakaway leader. Apply a strong cohesion force directly.
                        this.vx += (other.x - this.x) * cohesionForce * breakawayAttractionMultiplier;
                        this.vy += (other.y - this.y) * cohesionForce * breakawayAttractionMultiplier;
                    } else {
                        // This is a normal flock member. Add its contribution to the average.
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
        }

        if (total > 0) {
            // Apply the standard flocking forces based on the average of NON-breakaway neighbors
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
        if (this.isBreakingAway) {
            // Every 15 frames (~0.25s), deviate from the current heading
            if (this.breakawayTimer % 15 === 0) {
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

                if (currentSpeed < 0.1) {
                    // If speed is very low, assign a new random direction and speed
                    this.vx = (Math.random() - 0.5) * speed * 2;
                    this.vy = (Math.random() - 0.5) * speed * 2;
                } else {
                    // Otherwise, deviate 45 degrees from the current heading
                    const currentAngle = Math.atan2(this.vy, this.vx);
                    const deviation = (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 3); // -45 or +45 degrees
                    const newAngle = currentAngle + deviation;
                    this.vx = Math.cos(newAngle) * currentSpeed;
                    this.vy = Math.sin(newAngle) * currentSpeed;
                }
            }

            this.breakawayTimer--;
            if (this.breakawayTimer <= 0) {
                this.isBreakingAway = false;
            }
        } else {
            // Apply flocking only when not breaking away
            this.flock(particles);

            // Broad Attraction (Magnetic Pull) is also a following behavior
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

            // Chance to randomly drift
            if (Math.random() < driftChance) {
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > 0.1) { // Only drift if moving
                    const currentAngle = Math.atan2(this.vy, this.vx);
                    // Get a random deviation between -driftAngle and +driftAngle
                    const deviation = (Math.random() * 2 - 1) * driftAngle;
                    const newAngle = currentAngle + deviation;
                    this.vx = Math.cos(newAngle) * currentSpeed;
                    this.vy = Math.sin(newAngle) * currentSpeed;
                }
            }

            // Chance to start breaking away
            if (Math.random() < breakawayChance) {
                this.isBreakingAway = true;
                this.breakawayTimer = 60; // 60 frames ~ 1 second
            }
        }
        
        // Limit speed (always apply)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > maxSpeed) {
            this.vx = (this.vx / currentSpeed) * maxSpeed;
            this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen (always apply)
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
        // Start at the tip of the squat head
        ctx.moveTo(this.size * 0.8, 0);

        // Top curve: Head to Body to Tail fin top
        ctx.bezierCurveTo(
            this.size * 0.4, this.size * 0.8,    // Control point 1: Wider head top
            -this.size * 0.5, this.size * 0.5,   // Control point 2: Tapering body top
            -this.size * 2.0, this.size * 0.2    // End point: Start of top tail fin
        );

        // Top Tail fin
        ctx.lineTo(-this.size * 2.5, this.size * 0.4); // Top point of tail fin
        ctx.lineTo(-this.size * 2.8, 0); // End of the tail

        // Bottom Tail fin
        ctx.lineTo(-this.size * 2.5, -this.size * 0.4); // Bottom point of tail fin
        ctx.lineTo(-this.size * 2.0, -this.size * 0.2); // Start of bottom tail fin

        // Bottom curve: Tail to Body to Head
        ctx.bezierCurveTo(
            -this.size * 0.5, -this.size * 0.5,  // Control point 2: Tapering body bottom
            this.size * 0.4, -this.size * 0.8,   // Control point 1: Wider head bottom
            this.size * 0.8, 0                   // End point: Back to the tip of the head
        );
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
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

updateParticles();
animate();

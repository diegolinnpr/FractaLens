precision highp float;

uniform vec2 iResolution;
uniform float iTime;

// ---------- Mandelbulb Distance Estimator ----------
float mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < 50; i++) {
        r = length(z);
        if (r > 2.0) break;

        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        float power = 8.0;

        float zr = pow(r, power);

        dr = pow(r, power - 1.0) * power * dr + 1.0;

        theta *= power;
        phi *= power;

        z = zr * vec3(
            sin(theta)*cos(phi),
            sin(theta)*sin(phi),
            cos(theta)
        ) + pos;
    }

    return 0.5 * log(r) * r / dr;
}

// ---------- Raymarch ----------
float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = mandelbulbDE(p);

        if (d < 0.001) return t;
        if (t > 100.0) break;

        t += d;
    }

    return -1.0;
}

// ---------- Main ----------
void main() {

    vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Camera
    vec3 ro = vec3(0.0, 0.0, 4.0);

    // simple rotation over time (so you see it's 3D)
    float angle = iTime * 0.3;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    ro.xz *= rot;

    vec3 rd = normalize(vec3(uv, -1.5));

    float t = raymarch(ro, rd);

    if (t > 0.0) {
        gl_FragColor = vec4(vec3(1.0), 1.0); // white fractal
    } else {
        gl_FragColor = vec4(vec3(0.0), 1.0); // black background
    }
}
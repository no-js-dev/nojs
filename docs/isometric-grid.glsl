/** @resolution */
uniform vec2 u_resolution;

void main() {
    vec2 pos = gl_FragCoord.xy;
    vec2 uv = pos / u_resolution;

    float period = 80.0;
    float edge = 0.5;

    float d1 = mod(pos.x * 0.5 + pos.y * 0.86603, period);
    float line1 = smoothstep(period - 1.0 - edge, period - 1.0, d1)
                * (1.0 - smoothstep(period, period + edge, d1));

    float d2 = mod(-pos.x * 0.5 + pos.y * 0.86603, period);
    float line2 = smoothstep(period - 1.0 - edge, period - 1.0, d2)
                * (1.0 - smoothstep(period, period + edge, d2));

    float grid = max(line1, line2);

    vec2 center = vec2(0.5, 0.55);
    vec2 diff = (uv - center) / vec2(1.2, 1.0);
    float dist = length(diff);

    float mask = 1.0;
    if (dist > 0.35) {
        if (dist < 0.70) {
            mask = mix(1.0, 0.35, (dist - 0.35) / 0.35);
        } else {
            mask = mix(0.35, 0.0, clamp((dist - 0.70) / 0.30, 0.0, 1.0));
        }
    }

    vec3 bg = vec3(0.027, 0.031, 0.043);
    vec3 color = bg + vec3(0.025) * grid * mask;
    gl_FragColor = vec4(color, 1.0);
}

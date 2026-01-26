#include "ok_color.frag"

//

varying mediump vec2 vTextureCoord;

uniform mediump float uHue;
uniform mediump float uSaturation;

//

const mediump float TAU = 6.283185307179586;

//

void main() {
    mediump float v = vTextureCoord.y;
    mediump vec3 rgb = okhsl2srgb(uHue * TAU, uSaturation, v);
    gl_FragColor = vec4(rgb, 1.0);
}

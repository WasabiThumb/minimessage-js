#include "ok_color.frag"

//

varying mediump vec2 vTextureCoord;

uniform mediump float uLightness;

//

const mediump float TAU = 6.283185307179586;
const mediump float PI_2 = 1.5707963267948966;

mediump float atan2(mediump float y, mediump float x) {
    if (abs(x) > abs(y)) {
        return atan(y,x);
    } else {
        return PI_2 - atan(x,y);
    }
}

//

void main() {
    mediump float u = vTextureCoord.x;
    mediump float v = vTextureCoord.y;

    // Get circular coordinates
    mediump float ud = u - 0.5;
    mediump float vd = v - 0.5;
    mediump float magSqr = (ud * ud) + (vd * vd);
    if (magSqr > 0.25) magSqr = 0.25;
    mediump float theta = atan2(vd, ud);

    // Create OkHSL components (H & S)
    mediump float s = sqrt(magSqr) / 0.5;
    mediump float h = (theta < 0.0) ? theta + TAU : theta;

    // Convert to RGB
    mediump vec3 rgb = okhsl2srgb(h, s, uLightness);
    gl_FragColor = vec4(rgb, 1.0);
}
